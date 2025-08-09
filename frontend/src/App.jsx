import React, { useEffect, useState } from "react";
import { socket } from "./socket";
import RundownPanel from "./components/RundownPanel";
import TimerPanel from "./components/TimerPanel";
import MessagesPanel from "./components/MessagesPanel";
import "./controller.css";

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

  return (
    <div className="controller-grid">
      <div className="col left">
        <TimerPanel
          timer={timer}
          mode={mode} setMode={setMode}
          inputTime={inputTime} setInputTime={setInputTime}
          beepEnabled={beepEnabled} setBeepEnabled={setBeepEnabled}
        />
      </div>
      <div className="col center">
        <RundownPanel />
      </div>
      <div className="col right">
        <MessagesPanel />
      </div>
    </div>
  );
}
