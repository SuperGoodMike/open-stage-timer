import React, { useEffect, useState } from "react";
import { socket } from "./socket";
import "./controller.css";

function formatAsHMS(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

export default function App() {
  const [timer, setTimer] = useState({ time: 0, running: false, type: "countdown" });
  const [inputTime, setInputTime] = useState(300);
  const [mode, setMode] = useState("countdown");
  const [beepEnabled, setBeepEnabled] = useState(true); // NEW

  useEffect(() => {
    const onTimer = (t) => setTimer(t);
    const onSettings = (s) => setBeepEnabled(!!s?.beepEnabled); // NEW
    socket.on("timer_update", onTimer);
    socket.on("settings_update", onSettings);                   // NEW
    return () => {
      socket.off("timer_update", onTimer);
      socket.off("settings_update", onSettings);                // NEW
    };
  }, []);

  const start = () => socket.emit("start_timer", { time: inputTime, type: mode });
  const pause = () => socket.emit("pause_timer");
  const reset = () => socket.emit("reset_timer");
  const applyTime = () => socket.emit("set_timer", inputTime);
  const applyMode = (m) => { setMode(m); socket.emit("set_mode", m); };
  const setPreset = (secs) => { setInputTime(secs); socket.emit("set_timer", secs); };

  // NEW: controller toggle
  const toggleBeep = (e) => {
    const val = e.target.checked;
    setBeepEnabled(val);                 // optimistic UI
    socket.emit("set_beep_enabled", val);
  };

  return (
    <div className="controller">
      <h1 style={{ marginBottom: 10 }}>Open Stage Timer (Controller)</h1>
      <div className="time">{formatAsHMS(timer.time)}</div>

      <div style={{ marginBottom: 10 }}>
        <label>Mode:&nbsp;</label>
        <select value={mode} onChange={(e) => applyMode(e.target.value)}>
          <option value="countdown">Countdown</option>
          <option value="countup">Count Up</option>
          <option value="clock">Clock</option>
        </select>
      </div>

      {mode !== "clock" && (
        <div style={{ marginBottom: 10 }}>
          <label>Seconds:&nbsp;</label>
          <input type="number" value={inputTime} min={0} onChange={(e) => setInputTime(Number(e.target.value))} />
          <button onClick={applyTime} style={{ marginLeft: 8 }}>Apply</button>
          <span style={{ marginLeft: 12 }}>
            Presets: <button onClick={() => setPreset(30)}>30s</button> <button onClick={() => setPreset(60)}>1m</button> <button onClick={() => setPreset(300)}>5m</button>
          </span>
        </div>
      )}

      <div className="buttons">
        <button onClick={start} disabled={timer.running && mode !== "clock"}>Start</button>
        <button onClick={pause} disabled={!timer.running || mode === "clock"}>Pause</button>
        <button onClick={reset}>Reset</button>
      </div>

      {/* NEW: Beep toggle */}
      <div style={{ marginTop: 10 }}>
        <label>
          <input type="checkbox" checked={beepEnabled} onChange={toggleBeep} />&nbsp;Beep at zero
        </label>
      </div>

      <p style={{ opacity: 0.7, marginTop: 12 }}>
        Viewer: <code>http://{window.location.hostname}:5173/viewer</code>
      </p>
    </div>
  );
}