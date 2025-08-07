import React, { useEffect, useState } from "react";
import io from "socket.io-client";

// Resolve backend address from env or current host
const backendHost = import.meta.env.VITE_BACKEND_URL || `${window.location.hostname}:4000`;
const socket = io(`http://${backendHost}`);

function formatAsHMS(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

export default function App() {
  const [timer, setTimer] = useState({ time: 0, running: false, type: "countdown" });
  const [inputTime, setInputTime] = useState(300); // default 5 min
  const [mode, setMode] = useState("countdown");

  useEffect(() => {
    socket.on("timer_update", setTimer);
    return () => socket.off("timer_update");
  }, []);

  const start = () => {
    const payload = { type: mode };
    if (mode !== "clock") payload.time = Math.max(0, Number(inputTime) || 0);
    socket.emit("start_timer", payload);
  };
  const stop = () => socket.emit("stop_timer");
  const reset = () => socket.emit("reset_timer");

  const display = formatAsHMS(timer.time);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }} className="p-6 text-center">
      <h1 className="text-3xl font-bold mb-4">Open Stage Timer</h1>
      <div className="text-6xl mb-4 tabular-nums">{display}</div>

      <div className="mb-4 space-x-2">
        <label>
          Mode:
          <select value={mode} onChange={(e) => setMode(e.target.value)} className="border p-2 ml-2">
            <option value="countdown">Countdown</option>
            <option value="countup">Count Up</option>
            <option value="clock">Clock</option>
          </select>
        </label>
      </div>

      {mode !== "clock" && (
        <div className="mb-4">
          <label className="mr-2">Seconds:</label>
          <input
            type="number"
            value={inputTime}
            onChange={(e) => setInputTime(e.target.value)}
            className="border p-2"
            min={0}
          />
        </div>
      )}

      <div className="mt-4 space-x-2">
        <button onClick={start} className="bg-green-600 text-white px-4 py-2 rounded">Start</button>
        <button onClick={stop} className="bg-yellow-600 text-white px-4 py-2 rounded">Stop</button>
        <button onClick={reset} className="bg-red-600 text-white px-4 py-2 rounded">Reset</button>
      </div>

      <p className="mt-6 text-sm" style={{ color: "#666" }}>
        Backend: <code>http://{backendHost}</code> · Frontend: Vite at <code>http://{window.location.hostname}:5173</code>
      </p>
    </div>
  );
}
