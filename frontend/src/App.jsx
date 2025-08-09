import React, { useEffect, useState } from "react";
import { socket } from "./socket";
import RundownPanel from "./components/RundownPanel";
import "./controller.css";

function formatAsHMS(s) { s = Math.max(0, Math.floor(Number(s)||0)); const h=String(Math.floor(s/3600)).padStart(2,"0"), m=String(Math.floor((s%3600)/60)).padStart(2,"0"), sec=String(s%60).padStart(2,"0"); return `${h}:${m}:${sec}`; }

export default function App() {
  const [timer, setTimer] = useState({ time: 0, running: false, type: "countdown" });
  const [inputTime, setInputTime] = useState(300);
  const [mode, setMode] = useState("countdown");
  const [beepEnabled, setBeepEnabled] = useState(true);

  useEffect(() => {
    const onTimer = (t) => setTimer(t);
    const onSettings = (s) => setBeepEnabled(!!s?.beepEnabled);
    socket.on("timer_update", onTimer);
    socket.on("settings_update", onSettings);
    return () => { socket.off("timer_update", onTimer); socket.off("settings_update", onSettings); };
  }, []);

  const start = () => socket.emit("start_timer", { time: inputTime, type: mode });
  const pause = () => socket.emit("pause_timer");
  const reset = () => socket.emit("reset_timer");
  const applyTime = () => socket.emit("set_timer", inputTime);
  const applyMode = (m) => { setMode(m); socket.emit("set_mode", m); };
  const setPreset = (secs) => { setInputTime(secs); socket.emit("set_timer", secs); };
  const toggleBeep = (e) => { const v=e.target.checked; setBeepEnabled(v); socket.emit("set_beep_enabled", v); };

  return (
    <div className="controller">
      <RundownPanel />

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

      <div style={{ marginTop: 10 }}>
        <label>
          <input type="checkbox" checked={beepEnabled} onChange={toggleBeep} />&nbsp;Beep at zero
        </label>
      </div>
    </div>
  );
}