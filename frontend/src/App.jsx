import React, { useEffect, useState } from "react";
import { socket } from "./socket";   // ✅ use shared socket
import "./controller.css";

const backendHost = window.location.hostname;

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
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected to backend");
      setConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from backend");
      setConnected(false);
    });

    socket.on("timer_update", ({ time, running }) => {
      setTime(time);
      setRunning(running);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("timer_update");
    };
  }, []);

  const startTimer = () => {
    console.log("Emitting start_timer");
    socket.emit("start_timer");
  };

  const pauseTimer = () => {
    console.log("Emitting pause_timer");
    socket.emit("pause_timer");
  };

  const resetTimer = () => {
    console.log("Emitting reset_timer");
    socket.emit("reset_timer");
  };

  const setTimer = () => {
    console.log("Emitting set_timer", inputTime);
    socket.emit("set_timer", inputTime);
  };

  return (
    <div className="controller">
      <div className="time">{formatAsHMS(time)}</div>
      <div className="buttons">
        <button onClick={startTimer} disabled={!connected || running}>Start</button>
        <button onClick={pauseTimer} disabled={!connected || !running}>Pause</button>
        <button onClick={resetTimer} disabled={!connected}>Reset</button>
      </div>
      <div>
        <input
          type="number"
          value={inputTime}
          onChange={(e) => setInputTime(Number(e.target.value))}
        />
        <button onClick={setTimer} disabled={!connected}>Set Time (seconds)</button>
      </div>
    </div>
  );
}