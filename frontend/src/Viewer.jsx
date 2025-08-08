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

export default function Viewer() {
  const [timer, setTimer] = useState({ time: 0, running: false, type: "countdown" });
  const [beepEnabled, setBeepEnabled] = useState(true); // synced from controller via settings_update
  const [audioReady, setAudioReady] = useState(false);

  const prevTime = useRef(0);
  const audioCtxRef = useRef(null);

  // Prime/unlock audio on first user gesture (required by browsers)
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
      } catch {
        // ignore
      } finally {
        window.removeEventListener("pointerdown", unlock);
        window.removeEventListener("keydown", unlock);
      }
    };

    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Tiny 200ms beep using Web Audio (no file needed)
  const playBeep = () => {
    try {
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880; // A5
      osc.connect(gain);
      gain.connect(ctx.destination);

      const t0 = ctx.currentTime;
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.exponentialRampToValueAtTime(0.2, t0 + 0.01);
      osc.start(t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
      osc.stop(t0 + 0.22);
    } catch {
      // ignore playback errors
    }
  };

  // Subscribe to timer/settings updates
  useEffect(() => {
    const onTimer = (t) => {
      // Beep only when countdown crosses from >0 to 0, if audio is ready and enabled
      if (audioReady && beepEnabled && t.type === "countdown" && prevTime.current > 0 && t.time === 0) {
        playBeep();
      }
      prevTime.current = t.time;
      setTimer(t);
    };

    const onSettings = (s) => setBeepEnabled(!!s?.beepEnabled);

    socket.on("timer_update", onTimer);
    socket.on("settings_update", onSettings);

    return () => {
      socket.off("timer_update", onTimer);
      socket.off("settings_update", onSettings);
    };
  }, [audioReady, beepEnabled]);

  return (
    <div className="viewer">
      {!audioReady && (
        <div
          style={{
            position: "fixed",
            top: 12,
            left: 12,
            padding: "8px 10px",
            background: "#222",
            color: "#fff",
            borderRadius: 6,
            fontSize: 14,
            opacity: 0.9,
          }}
        >
          Click anywhere to enable sound
        </div>
      )}
      <div className="time">{formatAsHMS(timer.time)}</div>
    </div>
  );
}
