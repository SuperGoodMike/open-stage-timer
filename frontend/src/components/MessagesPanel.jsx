import React, { useEffect, useMemo, useState } from "react";
import { socket } from "../socket";
import "./messages-panel.css";

export default function MessagesPanel() {
  const [messages, setMessages] = useState({ items: [], activeId: null });
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const onUpdate = (m) => setMessages(m);
    socket.on("messages_update", onUpdate);
    return () => socket.off("messages_update", onUpdate);
  }, []);

  const add = () => {
    if (!draft.trim()) return;
    socket.emit("message_add", draft.trim());
    setDraft("");
  };

  const update = (id, text) => socket.emit("message_update", { id, text });
  const remove = (id) => socket.emit("message_remove", id);
  const show = (id) => socket.emit("message_show", id);
  const hide = () => socket.emit("message_hide");

  // basic reorder via up/down
  const ids = useMemo(() => messages.items.map(m => m.id), [messages.items]);
  const move = (id, dir) => {
    const arr = ids.slice();
    const i = arr.indexOf(id); if (i === -1) return;
    const j = dir === "up" ? i-1 : i+1; if (j<0 || j>=arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    socket.emit("message_reorder", arr);
  };

  return (
    <div className="messages-panel">
      <div className="mp-header">
        <div className="mp-title">Messages</div>
        {messages.activeId ? <button className="ghost" onClick={hide}>Hide</button> : null}
      </div>

      <div className="mp-add">
        <textarea value={draft} onChange={(e)=>setDraft(e.target.value)} placeholder="Type message to show on Viewer..."/>
        <button onClick={add}>Add</button>
      </div>

      <div className="mp-list">
        {messages.items.map((m, idx) => {
          const live = m.id === messages.activeId;
          return (
            <div key={m.id} className={`mp-item ${live ? "live" : ""}`}>
              <div className="mp-row">
                <div className="mp-idx">#{idx+1}</div>
                <div className="mp-actions">
                  <button onClick={()=>move(m.id,"up")} title="Up">↑</button>
                  <button onClick={()=>move(m.id,"down")} title="Down">↓</button>
                  <button onClick={()=>remove(m.id)} title="Delete">🗑</button>
                </div>
              </div>
              <textarea className="mp-text" value={m.text} onChange={(e)=>update(m.id, e.target.value)} />
              <div className="mp-row">
                <div />
                {live
                  ? <button className="danger" onClick={hide}>Hide</button>
                  : <button className="primary" onClick={()=>show(m.id)}>Show</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
