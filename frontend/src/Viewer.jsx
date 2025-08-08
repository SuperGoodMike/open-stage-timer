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
  const [beepEnabled, setBeepEnabled] = useState(true);
  const [audioReady, setAudioReady] = useState(false);
  const prevTime = useRef(0);
  const audioCtxRef = useRef(null);

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

  useEffect(() => {
    const handleTimerUpdate = (t) => {
      if (audioReady && beepEnabled && t.type === "countdown" && prevTime.current > 0 && t.time === 0) {
        playBeep();
      }
      prevTime.current = t.time;
      setTimer(t);
    };
    const handleSettingsUpdate = (s) => setBeepEnabled(!!s?.beepEnabled);

    socket.on("timer_update", handleTimerUpdate);
    socket.on("settings_update", handleSettingsUpdate);

    return () => {
      socket.off("timer_update", handleTimerUpdate);
      socket.off("settings_update", handleSettingsUpdate);
    };
  }, [audioReady, beepEnabled]);

  const toggleBeep = () => {
    const newState = !beepEnabled;
    setBeepEnabled(newState);
    socket.emit("set_beep_enabled", newState);
  };

  return (
    <div className="viewer">
      <div className="time-display">{formatAsHMS(timer.time)}</div>
      <button onClick={toggleBeep} className="beep-toggle">
        {beepEnabled ? "Disable Beep" : "Enable Beep"}
      </button>
      {!audioReady && (
        <div className="sound-unlock">Click anywhere to enable sound</div>
      )}
    </div>
  );
}
