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
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [inputTime, setInputTime] = useState(300);

  useEffect(() => {
    socket.on("timer_update", ({ time, running }) => {
      setTime(time);
      setRunning(running);
    });
    return () => socket.off("timer_update");
  }, []);

  const startTimer = () => socket.emit("start_timer");
  const pauseTimer = () => socket.emit("pause_timer");
  const resetTimer = () => socket.emit("reset_timer");
  const setTimer = () => socket.emit("set_timer", inputTime);

  return (
    <div className="controller">
      <div className="time">{formatAsHMS(time)}</div>
      <div className="buttons">
        <button onClick={startTimer} disabled={running}>Start</button>
        <button onClick={pauseTimer} disabled={!running}>Pause</button>
        <button onClick={resetTimer}>Reset</button>
      </div>
      <div>
        <input
          type="number"
          value={inputTime}
          onChange={(e) => setInputTime(Number(e.target.value))}
        />
        <button onClick={setTimer}>Set Time (seconds)</button>
      </div>
    </div>
  );
}