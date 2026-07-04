const cooldownMs = 5 * 60 * 1000;
const defaultState = {
  count: 40,
  lastIncrementAt: 0
};

function getRedisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error("Missing Upstash Redis config");
  }

  return { url, token };
}

async function redisCommand(commandPath) {
  const { url, token } = getRedisConfig();
  const response = await fetch(`${url}/${commandPath}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Redis request failed: ${response.status}`);
  }

  return response.json();
}

async function getState() {
  const data = await redisCommand("get/mawdhou3-counter-state");
  if (!data || data.result == null) {
    return { ...defaultState };
  }

  try {
    const parsed = JSON.parse(data.result);
    return {
      count: Number.isFinite(parsed.count) ? parsed.count : defaultState.count,
      lastIncrementAt: Number.isFinite(parsed.lastIncrementAt) ? parsed.lastIncrementAt : 0
    };
  } catch {
    return { ...defaultState };
  }
}

async function setState(state) {
  const payload = encodeURIComponent(JSON.stringify(state));
  await redisCommand(`set/mawdhou3-counter-state/${payload}`);
}

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");

  if (request.method === "GET") {
    const state = await getState();
    const now = Date.now();
    const nextAllowedAt = state.lastIncrementAt + cooldownMs;
    const remainingMs = Math.max(0, nextAllowedAt - now);

    response.status(200).json({
      count: state.count,
      locked: remainingMs > 0,
      remainingMs
    });
    return;
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "GET, POST");
    response.status(405).json({ message: "Method not allowed" });
    return;
  }

  const state = await getState();
  const now = Date.now();
  const nextAllowedAt = state.lastIncrementAt + cooldownMs;

  if (now < nextAllowedAt) {
    response.status(429).json({
      message: "Cooldown active",
      count: state.count,
      locked: true,
      remainingMs: nextAllowedAt - now
    });
    return;
  }

  const nextState = {
    count: state.count + 1,
    lastIncrementAt: now
  };

  await setState(nextState);

  response.status(200).json({
    count: nextState.count,
    locked: true,
    remainingMs: cooldownMs
  });
}