// A tiny pure state engine so we can unit test easily.

function createInitialState() {
  return { time: 0, running: false, type: "countdown" };
}

function start(state, payload = {}) {
  const next = { ...state };
  if (typeof payload.time === "number") next.time = Math.max(0, Math.floor(payload.time));
  if (typeof payload.type === "string") next.type = payload.type;
  next.running = true;
  return next;
}

function pause(state) {
  return { ...state, running: false };
}

function reset(state) {
  return { ...state, running: false, time: 0 };
}

function setTime(state, seconds) {
  const val = Number(seconds);
  if (Number.isNaN(val) || val < 0) return state;
  return { ...state, time: Math.floor(val) };
}

function setMode(state, mode) {
  if (!["countdown", "countup", "clock"].includes(mode)) return state;
  return { ...state, type: mode };
}

// Advance one second
function tick(state) {
  const s = { ...state };
  if (s.type === "clock") {
    const now = new Date();
    s.time = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    return s;
  }
  if (!s.running) return s;

  if (s.type === "countdown") {
    s.time = Math.max(0, s.time - 1);
    if (s.time === 0) s.running = false;
  } else if (s.type === "countup") {
    s.time += 1;
  }
  return s;
}

module.exports = {
  createInitialState,
  start,
  pause,
  reset,
  setTime,
  setMode,
  tick,
};