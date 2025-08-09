// Simple in-memory rundown manager
const nanoid = () => Math.random().toString(36).slice(2, 9);

function clamp01(n) { n = Number(n); if (Number.isNaN(n)) return 0; return Math.max(0, Math.min(1, n)); }

function createDefaults() {
  return {
    items: [], // {id,title,notes,startTime,durationSec,status,color,warnPercent,critPercent}
    activeIndex: null,
    autoAdvance: false,              // default OFF
    showViewerTitleStripe: false,    // controller toggle
  };
}

function normalizePercents({ warnPercent, critPercent }) {
  let warn = clamp01(warnPercent);
  let crit = clamp01(critPercent);
  if (warn + crit > 0.95) { // keep a little space for green
    const scale = 0.95 / (warn + crit);
    warn = Number((warn * scale).toFixed(3));
    crit = Number((crit * scale).toFixed(3));
  }
  return { warnPercent: warn, critPercent: crit };
}

function addItem(state, partial) {
  const { warnPercent, critPercent } = normalizePercents({
    warnPercent: partial.warnPercent ?? 0.20, // 20%
    critPercent: partial.critPercent ?? 0.10, // 10%
  });
  const item = {
    id: nanoid(),
    title: partial.title || "Untitled",
    notes: partial.notes || "",
    startTime: partial.startTime || "",
    durationSec: Math.max(0, Number(partial.durationSec) || 0),
    status: "pending",
    color: partial.color || "#2ecc71",
    warnPercent,
    critPercent,
  };
  return { ...state, items: [...state.items, item] };
}

function updateItem(state, id, partial) {
  return {
    ...state,
    items: state.items.map((it) => {
      if (it.id !== id) return it;
      const next = { ...it, ...partial };
      if ("warnPercent" in partial || "critPercent" in partial) {
        const p = normalizePercents(next);
        next.warnPercent = p.warnPercent;
        next.critPercent = p.critPercent;
      }
      if ("durationSec" in partial) next.durationSec = Math.max(0, Number(partial.durationSec) || 0);
      return next;
    }),
  };
}

function removeItem(state, id) {
  const idx = state.items.findIndex((it) => it.id === id);
  let { activeIndex } = state;
  const items = state.items.filter((it) => it.id !== id);
  if (idx !== -1 && activeIndex !== null) {
    if (idx < activeIndex) activeIndex -= 1;
    if (idx === activeIndex) activeIndex = null;
  }
  return { ...state, items, activeIndex };
}

function reorder(state, newOrderIds) {
  const map = new Map(state.items.map((it) => [it.id, it]));
  const items = newOrderIds.map((id) => map.get(id)).filter(Boolean);
  return { ...state, items };
}

function markAllPending(items) {
  return items.map((it) => ({ ...it, status: "pending" }));
}

function startItem(state, id) {
  const idx = state.items.findIndex((it) => it.id === id);
  if (idx === -1) return state;
  const items = markAllPending(state.items);
  items[idx] = { ...items[idx], status: "running" };
  return { ...state, items, activeIndex: idx };
}

function markDone(state, idx) {
  const items = state.items.slice();
  if (items[idx]) items[idx] = { ...items[idx], status: "done" };
  return { ...state, items };
}

function nextIndex(state) {
  if (state.activeIndex === null) return null;
  const n = state.activeIndex + 1;
  return n < state.items.length ? n : null;
}

module.exports = {
  createDefaults,
  addItem,
  updateItem,
  removeItem,
  reorder,
  startItem,
  markDone,
  nextIndex,
};
