const cooldownMs = 5 * 60 * 1000;

const counterEl = document.getElementById("counter");
const buttonEl = document.getElementById("incrementBtn");
const statusEl = document.getElementById("status");

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

async function loadState() {
  const response = await fetch("/api/counter", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Failed to load counter state");
  }

  return response.json();
}

async function refresh() {
  try {
    const state = await loadState();
    const locked = state.locked === true;

    counterEl.textContent = String(state.count ?? 40);
    buttonEl.disabled = locked;

    if (locked) {
      statusEl.textContent = `Locked for ${formatDuration(state.remainingMs ?? cooldownMs)}.`;
    } else {
      statusEl.textContent = "Ready to add one.";
    }
  } catch {
    statusEl.textContent = "Unable to load the shared counter right now.";
    buttonEl.disabled = true;
  }
}

buttonEl.addEventListener("click", async () => {
  buttonEl.disabled = true;

  try {
    const response = await fetch("/api/counter", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action: "increment" })
    });

    const state = await response.json();

    if (!response.ok) {
      statusEl.textContent = state?.message || "Try again later.";
      await refresh();
      return;
    }

    counterEl.textContent = String(state.count ?? 40);
    statusEl.textContent = `Updated. Locked for ${formatDuration(cooldownMs)}.`;
    buttonEl.disabled = true;

    setTimeout(refresh, 1000);
  } catch {
    statusEl.textContent = "Update failed. Please try again.";
    await refresh();
  }
});

refresh();
setInterval(refresh, 15000);
