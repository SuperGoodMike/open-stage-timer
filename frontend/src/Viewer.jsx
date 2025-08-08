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

//const beepData = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA=..."; // placeholder, you can swap with your asset
const beepData = "/beep.mp3"; // This will be served from public/beep.mp3

export default function Viewer() {
  const [timer, setTimer] = useState({ time: 0, running: false, type: "countdown" });
  const prevTime = useRef(0);
  const audioRef = useRef(null);

  useEffect(() => {
    socket.on("timer_update", (t) => {
      // Edge-detect zero (only on transition to 0)
      if (t.type === "countdown" && prevTime.current > 0 && t.time === 0 && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
      prevTime.current = t.time;
      setTimer(t);
    });
    return () => socket.off("timer_update");
  }, []);

  return (
    <div className="viewer">
      <audio ref={audioRef} src={beepData} preload="auto" />
      <div className="time">{formatAsHMS(timer.time)}</div>
    </div>
  );
}