import { useState, useEffect } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:4000");

function App() {
  const [timer, setTimer] = useState({ time: 0, running: false, type: "countdown" });
  const [inputTime, setInputTime] = useState(60);

  useEffect(() => {
    socket.on("timer_update", setTimer);
    return () => socket.off("timer_update");
  }, []);

  const start = () => {
    socket.emit("start_timer", { time: inputTime, type: "countdown" });
  };
  const stop = () => socket.emit("stop_timer");
  const reset = () => socket.emit("reset_timer");

  return (
    <div className="p-6 text-center">
      <h1 className="text-3xl font-bold mb-4">Stage Timer</h1>
      <div className="text-6xl mb-4">{timer.time}s</div>
      <input
        type="number"
        value={inputTime}
        onChange={(e) => setInputTime(+e.target.value)}
        className="border p-2"
      />
      <div className="mt-4 space-x-2">
        <button onClick={start} className="bg-green-500 text-white px-4 py-2 rounded">Start</button>
        <button onClick={stop} className="bg-yellow-500 text-white px-4 py-2 rounded">Stop</button>
        <button onClick={reset} className="bg-red-500 text-white px-4 py-2 rounded">Reset</button>
      </div>
    </div>
  );
}

export default App;