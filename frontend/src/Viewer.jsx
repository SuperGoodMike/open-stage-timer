import React, { useEffect, useRef, useState } from "react";
import { socket } from "./socket";
import "./viewer.css";

function formatAsHMS(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

// NEW: tiny beep using Web Audio API (no file needed)
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880; // 880 Hz (A5)
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    o.start();
    // quick 200ms beep
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
    o.stop(ctx.currentTime + 0.22);
  } catch (_) {
    // ignore failures (e.g., autoplay restrictions)
  }
}

export default function Viewer() {
  const [timer, setTimer] = useState({ time: 0, running: false, type: "countdown" });
  const [beepEnabled, setBeepEnabled] = useState(true);           // NEW
  const prevTime = useRef(0);

  useEffect(() => {
    const onTimer = (t) => {
      // Edge-detect 0 for countdown and only beep if enabled
      if (beepEnabled && t.type === "countdown" && prevTime.current > 0 && t.time === 0) {
        playBeep();
      }
      prevTime.current = t.time;
      setTimer(t);
    };
    const onSettings = (s) => setBeepEnabled(!!s?.beepEnabled);   // NEW

    socket.on("timer_update", onTimer);
    socket.on("settings_update", onSettings);                      // NEW

    return () => {
      socket.off("timer_update", onTimer);
      socket.off("settings_update", onSettings);                   // NEW
    };
  }, [beepEnabled]);

  return (
    <div className="viewer">
      <div className="time">{formatAsHMS(timer.time)}</div>
    </div>
  );
}