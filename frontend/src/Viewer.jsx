import React, { useEffect, useRef, useState, useMemo } from "react";
import { socket } from "./socket";
import "./viewer.css";

function formatAsHMS(s){
  s=Math.max(0,Math.floor(Number(s)||0));
  const h=String(Math.floor(s/3600)).padStart(2,"0"),
        m=String(Math.floor((s%3600)/60)).padStart(2,"0"),
        sec=String(s%60).padStart(2,"0");
  return `${h}:${m}:${sec}`;
}

export default function Viewer() {
  const [timer, setTimer] = useState({ time: 0, running: false, type: "countdown" });
  const [rd, setRd] = useState({ items: [], activeIndex: null, showViewerTitleStripe: false });
  const [beepEnabled, setBeepEnabled] = useState(true);
  const [audioReady, setAudioReady] = useState(false);

  // NEW: messages state (for overlay)
  const [messages, setMessages] = useState({ items: [], activeId: null });

  const prev = useRef(0);
  const audioCtx = useRef(null);

  // unlock audio (once)
  useEffect(()=> {
    const unlock = () => {
      try {
        if (!audioCtx.current) {
          const C = window.AudioContext || window.webkitAudioContext;
          audioCtx.current = new C();
        }
        if (audioCtx.current.state === "suspended") audioCtx.current.resume();
        setAudioReady(true);
      } catch {}
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once:true });
    window.addEventListener("keydown", unlock, { once:true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const beep = () => {
    try {
      const ctx = audioCtx.current; if (!ctx) return;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type="sine"; o.frequency.value=880; o.connect(g); g.connect(ctx.destination);
      const t0 = ctx.currentTime;
      g.gain.setValueAtTime(0.001,t0);
      g.gain.exponentialRampToValueAtTime(0.2,t0+0.01);
      o.start(t0);
      g.gain.exponentialRampToValueAtTime(0.0001,t0+0.2);
      o.stop(t0+0.22);
    } catch {}
  };

  // sockets
  useEffect(()=> {
    const onT = (t) => {
      if (audioReady && beepEnabled && t.type==="countdown" && prev.current>0 && t.time===0) beep();
      prev.current = t.time;
      setTimer(t);
    };
    const onS = (s) => setBeepEnabled(!!s?.beepEnabled);
    const onR = (r) => setRd(r);
    const onM = (m) => setMessages(m);                 // NEW

    socket.on("timer_update", onT);
    socket.on("settings_update", onS);
    socket.on("rundown_update", onR);
    socket.on("messages_update", onM);                 // NEW

    return () => {
      socket.off("timer_update", onT);
      socket.off("settings_update", onS);
      socket.off("rundown_update", onR);
      socket.off("messages_update", onM);              // NEW
    };
  }, [audioReady, beepEnabled]);

  const active = useMemo(() => rd.activeIndex!==null ? rd.items[rd.activeIndex] : null, [rd]);
  const duration = active?.durationSec ?? 0;
  const warnP = Math.max(0, Math.min(1, active?.warnPercent ?? 0.2));
  const critP = Math.max(0, Math.min(1, active?.critPercent ?? 0.1));
  const greenP = Math.max(0, 1 - (warnP + critP));

  // progress & time color
  let elapsed = 0, remaining = 0, pct = 0;
  if (duration > 0 && timer.type === "countdown") {
    remaining = timer.time;
    elapsed = Math.max(0, duration - remaining);
    pct = Math.min(1, Math.max(0, elapsed / duration));
  }
  const caretLeft = `${pct * 100}%`;

  // remaining ratio for color swap
  const rRatio = duration > 0 ? remaining / duration : 1;
  let timeClass = "viewer-time viewer-time--green";
  if (rRatio <= critP) timeClass = "viewer-time viewer-time--red";
  else if (rRatio <= critP + warnP) timeClass = "viewer-time viewer-time--amber";

  // message currently live
  const liveMessage = messages.activeId
    ? messages.items.find(m => m.id === messages.activeId)?.text
    : null;

  return (
    <div className="viewer">
      {rd.showViewerTitleStripe && active && (
        <div className="viewer-header">
          <div className="viewer-dot" style={{ background: active.color || "#28a745" }} />
          <div className="viewer-title">{active.title}</div>
          {active.notes ? <div className="viewer-notes">{active.notes}</div> : null}
        </div>
      )}

      <div className={timeClass}>{formatAsHMS(timer.time)}</div>

      {duration > 0 && (
        <div className="viewer-progress">
          <div className="viewer-progress-track">
            <div className="viewer-progress-seg" style={{ background: "#28a745", width: `${greenP*100}%` }} />
            <div className="viewer-progress-seg" style={{ background: "#f39c12", width: `${warnP*100}%` }} />
            <div className="viewer-progress-seg" style={{ background: "#e74c3c", width: `${critP*100}%` }} />
            <div className="viewer-caret" style={{ left: caretLeft }} />
          </div>
        </div>
      )}

      {/* NEW: message overlay */}
      {liveMessage && (
        <div className="viewer-message">
          {liveMessage}
        </div>
      )}

      {!audioReady && <div className="sound-unlock">Click anywhere to enable sound</div>}
    </div>
  );
}
