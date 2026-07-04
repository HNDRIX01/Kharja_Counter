const counterKey = "mawdhou3-counter-value";
const lastClickKey = "mawdhou3-counter-last-click";
const cooldownMs = 2 * 60 * 60 * 1000;
const maxStoredCount = 1_000_000;

const counterEl = document.getElementById("counter");
const buttonEl = document.getElementById("incrementBtn");
const statusEl = document.getElementById("status");

function readCount() {
  const stored = Number.parseInt(localStorage.getItem(counterKey) || "0", 10);
  return Number.isFinite(stored) && stored >= 0 ? Math.min(stored, maxStoredCount) : 0;
}

function readLastClick() {
  const stored = Number.parseInt(localStorage.getItem(lastClickKey) || "0", 10);
  return Number.isFinite(stored) && stored > 0 ? stored : 0;
}

function formatRemaining(ms) {
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${Math.max(minutes, 1)} minute${minutes === 1 ? "" : "s"}`;
  }

  return `${hours} hour${hours === 1 ? "" : "s"}${minutes > 0 ? ` ${minutes} minute${minutes === 1 ? "" : "s"}` : ""}`;
}

function updateUI() {
  const count = readCount();
  const lastClick = readLastClick();
  const now = Date.now();
  const nextAllowedAt = lastClick + cooldownMs;
  const locked = lastClick > 0 && now < nextAllowedAt;

  counterEl.textContent = String(count);
  buttonEl.disabled = locked;

  if (locked) {
    const remaining = nextAllowedAt - now;
    statusEl.textContent = `Locked for ${formatRemaining(remaining)}.`;
  } else {
    statusEl.textContent = "Ready to add one.";
  }
}

buttonEl.addEventListener("click", () => {
  const lastClick = readLastClick();
  const now = Date.now();

  if (lastClick > 0 && now - lastClick < cooldownMs) {
    updateUI();
    return;
  }

  const current = readCount();
  localStorage.setItem(counterKey, String(current + 1));
  localStorage.setItem(lastClickKey, String(now));
  updateUI();
});

window.addEventListener("storage", updateUI);
updateUI();
