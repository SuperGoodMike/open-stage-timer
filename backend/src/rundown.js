// Simple in‑memory rundown manager
const nanoid = () => Math.random().toString(36).slice(2, 9);

function createDefaults() {
  return {
    items: [], // {id,title,notes,startTime,durationSec,status:'pending'|'running'|'done',color}
    activeIndex: null,
    autoAdvance: false, // default OFF
    showViewerTitleStripe: false, // controller toggle
  };
}

function addItem(state, partial) {
  const item = {
    id: nanoid(),
    title: partial.title || "Untitled",
    notes: partial.notes || "",
    startTime: partial.startTime || "",
    durationSec: Math.max(0, Number(partial.durationSec) || 0),
    status: "pending",
    color: partial.color || "#2ecc71", // green by default
  };
  return { ...state, items: [...state.items, item] };
}

function updateItem(state, id, partial) {
  return {
    ...state,
    items: state.items.map((it) => (it.id === id ? { ...it, ...partial } : it)),
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