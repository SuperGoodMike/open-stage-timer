import React, { useEffect, useState } from "react";
import io from "socket.io-client";

const backendHost = import.meta.env.VITE_BACKEND_URL || `${window.location.hostname}:4000`;
const socket = io(`http://${backendHost}`);

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
      <div className="time">{formatAsHMS(timer.time)}</div>
    </div>
  );
}