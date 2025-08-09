import React, { useEffect, useMemo, useState } from "react";
import { socket } from "../socket";

export default function RundownPanel() {
  const [rundown, setRundown] = useState({ items: [], activeIndex: null, autoAdvance: false, showViewerTitleStripe: false });
  const [draft, setDraft] = useState({ title: "", notes: "", startTime: "", durationSec: 60, color: "#2ecc71" });

  useEffect(() => {
    const onUpdate = (rd) => setRundown(rd);
    socket.on("rundown_update", onUpdate);
    return () => socket.off("rundown_update", onUpdate);
  }, []);

  const add = () => {
    socket.emit("rundown_add_item", draft);
    setDraft({ title: "", notes: "", startTime: "", durationSec: 60, color: "#2ecc71" });
  };

  const start = (id) => socket.emit("rundown_start_item", id);
  const pause = () => socket.emit("pause_timer");
  const stop = () => socket.emit("reset_timer");
  const remove = (id) => socket.emit("rundown_remove_item", id);

  const toggleAA = (e) => socket.emit("rundown_set_auto_advance", e.target.checked);
  const toggleStripe = (e) => socket.emit("rundown_set_viewer_title_stripe", e.target.checked);

  // Drag & drop
  const [dragId, setDragId] = useState(null);
  const orderIds = useMemo(() => rundown.items.map((it) => it.id), [rundown.items]);
  const onDragStart = (id) => setDragId(id);
  const onDrop = (id) => {
    if (!dragId || dragId === id) return setDragId(null);
    const ids = orderIds.slice();
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(id);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    socket.emit("rundown_reorder", ids);
    setDragId(null);
  };

  return (
    <div style={{ background: "#1f1f1f", color: "#fff", padding: 12, borderRadius: 8, marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 16, alignItems: "end", flexWrap: "wrap" }}>
        <div>
          <label>Title<br/>
            <input value={draft.title} onChange={(e)=>setDraft((d)=>({...d,title:e.target.value}))}/>
          </label>
        </div>
        <div>
          <label>Start Time<br/>
            <input value={draft.startTime} onChange={(e)=>setDraft((d)=>({...d,startTime:e.target.value}))} placeholder="6:00 PM"/>
          </label>
        </div>
        <div>
          <label>Duration (sec)<br/>
            <input type="number" min={0} value={draft.durationSec} onChange={(e)=>setDraft((d)=>({...d,durationSec:Number(e.target.value)}))}/>
          </label>
        </div>
        <div>
          <label>Notes<br/>
            <input value={draft.notes} onChange={(e)=>setDraft((d)=>({...d,notes:e.target.value}))} style={{ width: 240 }}/>
          </label>
        </div>
        <div>
          <label>Color<br/>
            <input type="color" value={draft.color} onChange={(e)=>setDraft((d)=>({...d,color:e.target.value}))}/>
          </label>
        </div>
        <button onClick={add} style={{ height: 36 }}>Add</button>
        <label style={{ marginLeft: 12 }}>
          <input type="checkbox" checked={rundown.autoAdvance} onChange={toggleAA}/> Auto‑advance
        </label>
        <label style={{ marginLeft: 12 }}>
          <input type="checkbox" checked={rundown.showViewerTitleStripe} onChange={toggleStripe}/> Viewer Title/Stripe
        </label>
      </div>

      <div style={{ marginTop: 12 }}>
        {rundown.items.map((it, i) => (
          <div key={it.id}
            draggable
            onDragStart={()=>onDragStart(it.id)}
            onDragOver={(e)=>e.preventDefault()}
            onDrop={()=>onDrop(it.id)}
            style={{ display: "grid", gridTemplateColumns: "48px 120px 100px 1fr 220px 240px", gap: 8, alignItems: "center", padding: 8, marginBottom: 8, borderRadius: 6, background: i===rundown.activeIndex?"#2a2a2a":"#141414", border: `2px solid ${it.color}` }}>
            <div style={{ opacity: 0.7 }}>{i+1}</div>
            <div>{it.startTime || "—"}</div>
            <div>{Math.floor(it.durationSec/60)}:{String(it.durationSec%60).padStart(2,"0")}</div>
            <div>
              <div style={{ fontWeight: 600 }}>{it.title}</div>
              <div style={{ opacity: 0.7, fontSize: 12 }}>{it.notes}</div>
            </div>
            <div>
              <button onClick={()=>start(it.id)} title="Start">▶</button>
              <button onClick={pause} title="Pause" style={{ marginLeft: 6 }}>⏸</button>
              <button onClick={stop} title="Stop/Reset" style={{ marginLeft: 6 }}>⏹</button>
            </div>
            <div style={{ textAlign: "right" }}>
              <button onClick={()=>remove(it.id)} title="Delete">🗑</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}