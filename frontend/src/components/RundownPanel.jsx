import React, { useEffect, useMemo, useState } from "react";
import { socket } from "../socket";

export default function RundownPanel() {
  const [rundown, setRundown] = useState({ items: [], activeIndex: null, autoAdvance: false, showViewerTitleStripe: false });
  const [draft, setDraft] = useState({ title: "", notes: "", startTime: "", durationSec: 60, color: "#2ecc71", warnPercent: 0.2, critPercent: 0.1 });

  useEffect(() => {
    const onUpdate = (rd) => setRundown(rd);
    socket.on("rundown_update", onUpdate);
    return () => socket.off("rundown_update", onUpdate);
  }, []);

  const add = () => { socket.emit("rundown_add_item", draft); setDraft({ title: "", notes: "", startTime: "", durationSec: 60, color: "#2ecc71", warnPercent: 0.2, critPercent: 0.1 }); };
  const start = (id) => socket.emit("rundown_start_item", id);
  const pause = () => socket.emit("pause_timer");
  const stop  = () => socket.emit("reset_timer");
  const remove = (id) => socket.emit("rundown_remove_item", id);
  const setAA = (e) => socket.emit("rundown_set_auto_advance", e.target.checked);
  const setStripe = (e) => socket.emit("rundown_set_viewer_title_stripe", e.target.checked);

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

  const onRowPercentChange = (it, key, raw) => {
    const val = Math.max(0, Math.min(95, Number(raw))); // keep sane 0..95
    socket.emit("rundown_update_item", { id: it.id, patch: { [key]: val / 100 } });
  };

  return (
    <div style={{ background: "#1f1f1f", color: "#fff", padding: 12, borderRadius: 8, marginBottom: 16 }}>
      {/* Add form */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 140px 1fr 110px 110px 110px auto", gap: 12, alignItems: "end" }}>
        <div>
          <label>Title<br/><input value={draft.title} onChange={(e)=>setDraft(d=>({...d,title:e.target.value}))}/></label>
        </div>
        <div>
          <label>Start Time<br/><input value={draft.startTime} onChange={(e)=>setDraft(d=>({...d,startTime:e.target.value}))} placeholder="6:00 PM"/></label>
        </div>
        <div>
          <label>Duration (sec)<br/><input type="number" min={0} value={draft.durationSec} onChange={(e)=>setDraft(d=>({...d,durationSec:Number(e.target.value)}))}/></label>
        </div>
        <div>
          <label>Notes<br/><input value={draft.notes} onChange={(e)=>setDraft(d=>({...d,notes:e.target.value}))}/></label>
        </div>
        <div>
          <label>Warn %<br/><input type="number" min={0} max={95} value={Math.round(draft.warnPercent*100)} onChange={(e)=>setDraft(d=>({...d,warnPercent:Number(e.target.value)/100}))}/></label>
        </div>
        <div>
          <label>Crit %<br/><input type="number" min={0} max={95} value={Math.round(draft.critPercent*100)} onChange={(e)=>setDraft(d=>({...d,critPercent:Number(e.target.value)/100}))}/></label>
        </div>
        <div>
          <label>Color<br/><input type="color" value={draft.color} onChange={(e)=>setDraft(d=>({...d,color:e.target.value}))}/></label>
        </div>
        <button onClick={add} style={{ height: 36 }}>Add</button>
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 10 }}>
        <label><input type="checkbox" checked={rundown.autoAdvance} onChange={setAA}/> Auto-advance</label>
        <label><input type="checkbox" checked={rundown.showViewerTitleStripe} onChange={setStripe}/> Viewer Title/Stripe</label>
      </div>

      {/* List */}
      <div style={{ marginTop: 12 }}>
        {rundown.items.map((it, i) => (
          <div key={it.id}
            draggable
            onDragStart={()=>onDragStart(it.id)}
            onDragOver={(e)=>e.preventDefault()}
            onDrop={()=>onDrop(it.id)}
            style={{ display: "grid", gridTemplateColumns: "48px 100px 100px 1fr 110px 110px 120px 160px 60px", gap: 8, alignItems: "center", padding: 8, marginBottom: 8, borderRadius: 6, background: i===rundown.activeIndex? "#2a2a2a":"#141414", border: `2px solid ${it.color}` }}>
            <div style={{ opacity: 0.7 }}>{i+1}</div>
            <div>{it.startTime || "—"}</div>
            <div>{Math.floor(it.durationSec/60)}:{String(it.durationSec%60).padStart(2,"0")}</div>
            <div>
              <div style={{ fontWeight: 600 }}>{it.title}</div>
              <div style={{ opacity: 0.7, fontSize: 12 }}>{it.notes}</div>
            </div>

            {/* Warn/Crit editors */}
            <div>
              <label style={{ fontSize: 12, opacity: 0.8 }}>Warn%<br/>
                <input type="number" min={0} max={95} value={Math.round((it.warnPercent??0.2)*100)}
                  onChange={(e)=>onRowPercentChange(it,"warnPercent",e.target.value)} style={{ width: 80 }}/>
              </label>
            </div>
            <div>
              <label style={{ fontSize: 12, opacity: 0.8 }}>Crit%<br/>
                <input type="number" min={0} max={95} value={Math.round((it.critPercent??0.1)*100)}
                  onChange={(e)=>onRowPercentChange(it,"critPercent",e.target.value)} style={{ width: 80 }}/>
              </label>
            </div>

            <div><button onClick={()=>start(it.id)}>▶ Start</button></div>
            <div>
              <button onClick={pause}>⏸ Pause</button>
              <button onClick={stop} style={{ marginLeft: 6 }}>⏹ Reset</button>
            </div>
            <div style={{ textAlign: "right" }}><button onClick={()=>remove(it.id)}>🗑</button></div>
          </div>
        ))}
      </div>
    </div>
  );
}
