import React, { useEffect, useRef, useState, useMemo } from "react";
import { socket } from "./socket";
import "./viewer.css";

function formatAsHMS(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

export default function Viewer() {
  const [timer, setTimer] = useState({ time: 0, running: false, type: "countdown" });
  const [rd, setRd] = useState({ items: [], activeIndex: null, showViewerTitleStripe: false });
  const [beepEnabled, setBeepEnabled] = useState(true);
  const [audioReady, setAudioReady] = useState(false);

  const prevTime = useRef(0);
  const audioCtxRef = useRef(null);

  // unlock audio
  useEffect(() => {
    const unlock = () => {
      try {
        if (!audioCtxRef.current) {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          audioCtxRef.current = new Ctx();
        }
        if (audioCtxRef.current.state === "suspended") {
          audioCtxRef.current.resume();
        }
        setAudioReady(true);
      } catch {}
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // tiny beep
  const playBeep = () => {
    try {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t0 = ctx.currentTime;
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.exponentialRampToValueAtTime(0.2, t0 + 0.01);
      osc.start(t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
      osc.stop(t0 + 0.22);
    } catch {}
  };

  // socket wiring
  useEffect(() => {
    const handleTimerUpdate = (t) => {
      if (audioReady && beepEnabled && t.type === "countdown" && prevTime.current > 0 && t.time === 0) {
        playBeep();
      }
      prevTime.current = t.time;
      setTimer(t);
    };
    const handleSettingsUpdate = (s) => setBeepEnabled(!!s?.beepEnabled);
    const handleRundownUpdate = (r) => setRd(r);

    socket.on("timer_update", handleTimerUpdate);
    socket.on("settings_update", handleSettingsUpdate);
    socket.on("rundown_update", handleRundownUpdate);

    return () => {
      socket.off("timer_update", handleTimerUpdate);
      socket.off("settings_update", handleSettingsUpdate);
      socket.off("rundown_update", handleRundownUpdate);
    };
  }, [audioReady, beepEnabled]);

  const active = useMemo(() => (
    rd.activeIndex !== null ? rd.items[rd.activeIndex] : null
  ), [rd]);

  // progress info
  const durationSec = active?.durationSec ?? 0;
  const remaining = timer.type === "countdown" ? timer.time : 0;
  const elapsed = Math.max(0, durationSec - remaining);
  const pct = durationSec > 0 ? Math.min(1, Math.max(0, elapsed / durationSec)) : 0;

  // segment cutoffs (like your example): 70% green, 20% amber, 10% red
  const cuts = useMemo(() => [
    { color: "#28a745", width: 0.70 }, // green
    { color: "#f39c12", width: 0.20 }, // amber
    { color: "#e74c3c", width: 0.10 }, // red
  ], []);

  // caret position in %
  const caretLeft = `${pct * 100}%`;

  return (
    <div className="viewer">
      {/* header: title + notes */}
      {rd.showViewerTitleStripe && active && (
        <div className="viewer-header">
          <div className="viewer-dot" style={{ background: active.color || "#28a745" }} />
          <div className="viewer-title">{active.title}</div>
          {active.notes ? <div className="viewer-notes">{active.notes}</div> : null}
        </div>
      )}

      {/* time */}
      <div className="viewer-time">{formatAsHMS(timer.time)}</div>

      {/* progress bar */}
      {durationSec > 0 && (
        <div className="viewer-progress">
          <div className="viewer-progress-track">
            {cuts.map((c, i) => (
              <div key={i} className="viewer-progress-seg" style={{ background: c.color, width: `${c.width * 100}%` }} />
            ))}
            <div className="viewer-caret" style={{ left: caretLeft }} />
          </div>
        </div>
      )}

      {!audioReady && (
        <div className="sound-unlock">Click anywhere to enable sound</div>
      )}
    </div>
  );
}
