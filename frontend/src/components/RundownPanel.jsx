import React, { useEffect, useMemo, useState } from "react";
import { socket } from "../socket";

function mmss(sec) {
  sec = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(sec / 60);
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

// Use first non-empty line of notes as a short title (for viewer header)
// Keeps your viewer stripe meaningful even though we removed Title from UI.
function deriveTitle(notes) {
  const firstLine = String(notes || "")
    .split(/\r?\n/)[0]
    .trim();
  return firstLine.slice(0, 60) || "Untitled";
}

export default function RundownPanel() {
  const [rundown, setRundown] = useState({
    items: [],
    activeIndex: null,
    autoAdvance: false,
    showViewerTitleStripe: false,
  });

  const [draft, setDraft] = useState({
    // Title removed: we only keep Notes and infer title from it
    notes: "",
    startTime: "",
    durationSec: 60,
    color: "#2ecc71",
    warnPercent: 0.2,
    critPercent: 0.1,
  });

  // Inline edit state for Notes
  const [editId, setEditId] = useState(null);
  const [editValue, setEditValue] = useState("");

  // subscribe to rundown updates
  useEffect(() => {
    const onUpdate = (rd) => setRundown(rd);
    socket.on("rundown_update", onUpdate);
    return () => socket.off("rundown_update", onUpdate);
  }, []);

  // actions
  const add = () => {
    const cleanNotes = draft.notes;
    const payload = {
      // title is auto-derived from notes
      title: deriveTitle(cleanNotes),
      notes: cleanNotes,
      startTime: draft.startTime,
      durationSec: Math.max(0, Number(draft.durationSec) || 0),
      color: draft.color,
      warnPercent: Math.max(0, Math.min(0.95, Number(draft.warnPercent) || 0.2)),
      critPercent: Math.max(0, Math.min(0.95, Number(draft.critPercent) || 0.1)),
    };
    socket.emit("rundown_add_item", payload);
    setDraft({
      notes: "",
      startTime: "",
      durationSec: 60,
      color: "#2ecc71",
      warnPercent: 0.2,
      critPercent: 0.1,
    });
  };

  const start = (id) => socket.emit("rundown_start_item", id);
  const pause = () => socket.emit("pause_timer");
  const stop = () => socket.emit("reset_timer");
  const remove = (id) => socket.emit("rundown_remove_item", id);
  const toggleAA = (e) => socket.emit("rundown_set_auto_advance", e.target.checked);
  const toggleStripe = (e) =>
    socket.emit("rundown_set_viewer_title_stripe", e.target.checked);

  // inline edit for Warn/Crit %
  const onRowPercentChange = (it, key, raw) => {
    const val = Math.max(0, Math.min(95, Number(raw)));
    socket.emit("rundown_update_item", { id: it.id, patch: { [key]: val / 100 } });
  };

  // === Drag & drop ===
  const [dragId, setDragId] = useState(null);
  const [hoverId, setHoverId] = useState(null);
  const [hoverPos, setHoverPos] = useState("after"); // "before" | "after"
  const orderIds = useMemo(() => rundown.items.map((it) => it.id), [rundown.items]);

  const onDragStart = (id) => setDragId(id);

  const onDragOverRow = (e, id) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    setHoverId(id);
    setHoverPos(e.clientY < mid ? "before" : "after");
  };

  const onDragLeaveRow = () => {
    setHoverId(null);
  };

  const onDropRow = (id) => {
    if (!dragId) return;
    const src = orderIds.indexOf(dragId);
    const dst = orderIds.indexOf(id);
    if (src === -1 || dst === -1) return;

    const ids = orderIds.slice();
    const [moved] = ids.splice(src, 1);

    // Insert before/after hovered row
    const insertAt =
      hoverPos === "before" ? (dst <= src ? dst : dst) : (dst < src ? dst + 1 : dst + 1);

    ids.splice(insertAt, 0, moved);

    socket.emit("rundown_reorder", ids);
    setDragId(null);
    setHoverId(null);
  };

  // keyboard fallback
  const moveUp = (id) => {
    const ids = orderIds.slice();
    const idx = ids.indexOf(id);
    if (idx > 0) {
      [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
      socket.emit("rundown_reorder", ids);
    }
  };
  const moveDown = (id) => {
    const ids = orderIds.slice();
    const idx = ids.indexOf(id);
    if (idx !== -1 && idx < ids.length - 1) {
      [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
      socket.emit("rundown_reorder", ids);
    }
  };

  // ==== Inline edit handlers for Notes ====
  const beginEditNotes = (it) => {
    setEditId(it.id);
    setEditValue(String(it.notes || ""));
  };

  const cancelEditNotes = () => {
    setEditId(null);
    setEditValue("");
  };

  const saveEditNotes = (it) => {
    const notes = String(editValue || "");
    const patch = {
      notes,
      // keep viewer header meaningful:
      title: deriveTitle(notes),
    };
    socket.emit("rundown_update_item", { id: it.id, patch });
    cancelEditNotes();
  };

  const onEditKeyDown = (e, it) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cancelEditNotes();
      return;
    }
    // Ctrl/Cmd + Enter to save
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      saveEditNotes(it);
    }
  };

  return (
    <div
      style={{
        background: "#1f1f1f",
        color: "#fff",
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        border: "1px solid #2a2a2a",
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      {/* Add form (wraps cleanly) */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "end",
          minWidth: 0,
        }}
      >
        {/* Title removed — just Notes */}
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <label>
            Notes
            <br />
            <input
              style={{ width: "100%" }}
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              placeholder="e.g. Intro / Guest A / Q&A"
            />
          </label>
        </div>

        <div style={{ flex: "0 1 140px" }}>
          <label>
            Start Time
            <br />
            <input
              style={{ width: "100%" }}
              value={draft.startTime}
              onChange={(e) =>
                setDraft((d) => ({ ...d, startTime: e.target.value }))
              }
              placeholder="6:00 PM"
            />
          </label>
        </div>

        <div style={{ flex: "0 1 140px" }}>
          <label>
            Duration (sec)
            <br />
            <input
              type="number"
              min={0}
              style={{ width: "100%" }}
              value={draft.durationSec}
              onChange={(e) =>
                setDraft((d) => ({ ...d, durationSec: Number(e.target.value) }))
              }
            />
          </label>
        </div>

        <div style={{ flex: "0 1 110px" }}>
          <label>
            Warn %
            <br />
            <input
              type="number"
              min={0}
              max={95}
              style={{ width: "100%" }}
              value={Math.round(draft.warnPercent * 100)}
              onChange={(e) =>
                setDraft((d) => ({ ...d, warnPercent: Number(e.target.value) / 100 }))
              }
            />
          </label>
        </div>

        <div style={{ flex: "0 1 110px" }}>
          <label>
            Crit %
            <br />
            <input
              type="number"
              min={0}
              max={95}
              style={{ width: "100%" }}
              value={Math.round(draft.critPercent * 100)}
              onChange={(e) =>
                setDraft((d) => ({ ...d, critPercent: Number(e.target.value) / 100 }))
              }
            />
          </label>
        </div>

        <div style={{ flex: "0 1 110px" }}>
          <label>
            Color
            <br />
            <input
              type="color"
              style={{ width: "100%" }}
              value={draft.color}
              onChange={(e) => setDraft((d) => ({ ...d, color: e.target.value }))}
            />
          </label>
        </div>

        <div style={{ flex: "0 0 auto" }}>
          <button onClick={add} style={{ height: 36 }}>
            Add
          </button>
        </div>
      </div>

      {/* toggles */}
<div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
  {/* Show Viewer Title (header text) */}
  <label>
    <input
      type="checkbox"
      checked={!!rundown.showViewerTitle}
      onChange={(e) => socket.emit("rundown_set_viewer_title", e.target.checked)}
    />{" "}
    Viewer Title
  </label>

  <label>
    <input
      type="checkbox"
      checked={!!rundown.showViewerProgress}
      onChange={(e) => socket.emit("rundown_set_viewer_progress", e.target.checked)}
    />{" "}
    Progress bar
  </label>
  {/* Auto-advance (unchanged) */}
  <label>
    <input
      type="checkbox"
      checked={!!rundown.autoAdvance}
      onChange={(e) => socket.emit("rundown_set_auto_advance", e.target.checked)}
    />
    {" "}Auto-advance
  </label>
</div>

      {/* list */}
      <div style={{ marginTop: 12 }}>
        {rundown.items.map((it, i) => {
          const isActive = i === rundown.activeIndex;
          const isHover = hoverId === it.id;
          const isEditing = editId === it.id;

          return (
            <div
              key={it.id}
              draggable
              onDragStart={() => onDragStart(it.id)}
              onDragOver={(e) => onDragOverRow(e, it.id)}
              onDragLeave={onDragLeaveRow}
              onDrop={() => onDropRow(it.id)}
              style={{
                display: "grid",
                gridTemplateColumns:
                  "48px 100px 100px 1fr 110px 110px 120px 160px 90px",
                gap: 8,
                alignItems: "center",
                padding: 8,
                marginBottom: 8,
                borderRadius: 6,
                background: isActive ? "#2a2a2a" : "#141414",
                border: `2px solid ${it.color}`,
                position: "relative",
                minWidth: 0,
              }}
            >
              {/* hover indicator line */}
              {isHover && (
                <div
                  style={{
                    position: "absolute",
                    left: 4,
                    right: 4,
                    height: 0,
                    borderTop: "3px solid #0b5ed7",
                    top: hoverPos === "before" ? -2 : "auto",
                    bottom: hoverPos === "after" ? -2 : "auto",
                  }}
                />
              )}

              {/* # */}
              <div style={{ opacity: 0.7 }}>{i + 1}</div>

              {/* Start Time */}
              <div>{it.startTime || "—"}</div>

              {/* Duration */}
              <div>{mmss(it.durationSec)}</div>

              {/* Notes (inline editable) */}
              <div style={{ minWidth: 0 }}>
                {isEditing ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <textarea
                      autoFocus
                      rows={3}
                      style={{
                        width: "100%",
                        resize: "vertical",
                        background: "#0f0f0f",
                        color: "#fff",
                        border: "1px solid #333",
                        borderRadius: 6,
                        padding: 6,
                      }}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => onEditKeyDown(e, it)}
                      onBlur={() => saveEditNotes(it)}
                    />
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      <b>Ctrl/⌘ + Enter</b> to save • <b>Esc</b> to cancel
                    </div>
                  </div>
                ) : (
                  <div
                    className="rundown-notes"
                    style={{ opacity: 0.95, cursor: "text" }}
                    onClick={() => beginEditNotes(it)}
                    title="Click to edit notes"
                  >
                    {it.notes || <span style={{ opacity: 0.6 }}>(click to add notes)</span>}
                  </div>
                )}
              </div>

              {/* Warn% */}
              <div>
                <label style={{ fontSize: 12, opacity: 0.8 }}>
                  Warn%
                  <br />
                  <input
                    type="number"
                    min={0}
                    max={95}
                    style={{ width: 80 }}
                    value={Math.round((it.warnPercent ?? 0.2) * 100)}
                    onChange={(e) =>
                      onRowPercentChange(it, "warnPercent", e.target.value)
                    }
                  />
                </label>
              </div>

              {/* Crit% */}
              <div>
                <label style={{ fontSize: 12, opacity: 0.8 }}>
                  Crit%
                  <br />
                  <input
                    type="number"
                    min={0}
                    max={95}
                    style={{ width: 80 }}
                    value={Math.round((it.critPercent ?? 0.1) * 100)}
                    onChange={(e) =>
                      onRowPercentChange(it, "critPercent", e.target.value)
                    }
                  />
                </label>
              </div>

              {/* Start */}
              <div>
                <button onClick={() => start(it.id)} title="Start">
                  ▶ Start
                </button>
              </div>

              {/* Pause / Reset + Up/Down */}
              <div style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
                <button onClick={pause} title="Pause">
                  ⏸
                </button>
                <button onClick={stop} title="Reset">
                  ⏹
                </button>
                <button onClick={() => moveUp(it.id)} title="Up">
                  ↑
                </button>
                <button onClick={() => moveDown(it.id)} title="Down">
                  ↓
                </button>
              </div>

              {/* Delete */}
              <div style={{ textAlign: "right" }}>
                <button onClick={() => remove(it.id)} title="Delete">
                  🗑
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
