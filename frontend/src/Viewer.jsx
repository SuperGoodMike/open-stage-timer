import React, { useEffect, useState } from "react";
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

  useEffect(() => {
    socket.on("timer_update", setTimer);
    return () => socket.off("timer_update");
  }, []);

  return (
    <div className="viewer">
      <div className={`time ${timer.running ? "running" : "paused"}`}>
        {formatAsHMS(timer.time)}
      </div>
    </div>
  );
}