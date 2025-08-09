import React, { useLayoutEffect, useRef, useState } from "react";
import { socket } from "../socket";
import "./timer-panel.css";

function hms(s) {
  s = Math.max(0, Math.floor(Number(s) || 0));
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

export default function TimerPanel({
  timer,
  mode,
  setMode,
  inputTime,
  setInputTime,
  beepEnabled,
  setBeepEnabled,
}) {
  // --- autosize big digits based on panel width ---
  const boxRef = useRef(null);
  const [fontPx, setFontPx] = useState(96);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;

    const ro = new ResizeObserver(([entry]) => {
      const w = entry?.contentRect?.width || el.clientWidth || 360;
      // Roughly 8 glyphs (HH:MM:SS). Tweak scale for taste.
      const px = Math.max(48, Math.min(220, (w / 8) * 0.9));
      setFontPx(px);
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // --- socket actions ---
  const start = () => socket.emit("start_timer", { time: inputTime, type: mode });
  const pause = () => socket.emit("pause_timer");
  const reset = () => socket.emit("reset_timer");
  const applyTime = () => socket.emit("set_timer", inputTime);
  const nudge = (delta) => {
    const x = Math.max(0, (Number(inputTime) || 0) + delta);
    setInputTime(x);
    socket.emit("set_timer", x);
  };
  const changeMode = (m) => {
    setMode(m);
    socket.emit("set_mode", m);
  };
  const toggleBeep = (e) => {
    const v = e.target.checked;
    setBeepEnabled(v);
    socket.emit("set_beep_enabled", v);
  };

  return (
    <div className="timer-panel">
      <div className="timer-title">Open Stage Timer</div>

      <div
        ref={boxRef}
        className="timer-big"
        style={{ fontSize: `${fontPx}px`, whiteSpace: "nowrap", overflow: "hidden" }}
      >
        {hms(timer.time)}
      </div>

      <div className="timer-controls">
        <div className="row">
          <label>Mode</label>
          <select value={mode} onChange={(e) => changeMode(e.target.value)}>
            <option value="countdown">Countdown</option>
            <option value="countup">Count Up</option>
            <option value="clock">Clock</option>
          </select>
        </div>

        {mode !== "clock" && (
          <>
            <div className="row">
              <label>Seconds</label>
              <input
                type="number"
                min={0}
                value={inputTime}
                onChange={(e) => setInputTime(Number(e.target.value))}
              />
              <button onClick={applyTime}>Apply</button>
            </div>

            <div className="row nudges">
              <button onClick={() => nudge(-60)}>-1m</button>
              <button onClick={() => nudge(-10)}>-10s</button>
              <button onClick={() => nudge(10)}>+10s</button>
              <button onClick={() => nudge(60)}>+1m</button>
            </div>
          </>
        )}

        <div className="row transport">
          <button onClick={start} disabled={timer.running && mode !== "clock"}>
            Start
          </button>
          <button onClick={pause} disabled={!timer.running || mode === "clock"}>
            Pause
          </button>
          <button onClick={reset}>Reset</button>
        </div>

        <label className="row checkbox">
          <input type="checkbox" checked={beepEnabled} onChange={toggleBeep} /> Beep at
          zero
        </label>
      </div>
    </div>
  );
}
