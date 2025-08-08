const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// Health check
app.get("/", (_req, res) => {
  res.status(200).send({ ok: true, service: "open-stage-timer-backend" });
});

let timer = {
  time: 0,         // seconds (remaining for countdown / elapsed for countup / seconds since midnight for clock)
  running: false,
  type: "countdown", // "countdown" | "countup" | "clock"
};

// Tick every second
setInterval(() => {
  if (timer.type === "clock") {
    const now = new Date();
    timer.time = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    io.emit("timer_update", timer);
    return;
  }
  if (!timer.running) return;

  if (timer.type === "countdown") {
    timer.time = Math.max(0, timer.time - 1);
    if (timer.time === 0) timer.running = false;
  } else if (timer.type === "countup") {
    timer.time += 1;
  }
  io.emit("timer_update", timer);
}, 1000);

io.on("connection", (socket) => {
  console.log("client connected:", socket.id);
  socket.emit("timer_update", timer);

  // Start: optional payload { time?, type? }
  socket.on("start_timer", (data) => {
    console.log("start_timer", data);
    if (data && typeof data === "object") {
      if (typeof data.time === "number") timer.time = Math.max(0, Math.floor(data.time));
      if (typeof data.type === "string") timer.type = data.type;
    }
    timer.running = true;
    io.emit("timer_update", timer);
  });

  // Pause/Stop
  socket.on("pause_timer", () => {
    console.log("pause_timer");
    timer.running = false;
    io.emit("timer_update", timer);
  });
  socket.on("stop_timer", () => {
    console.log("stop_timer");
    timer.running = false;
    io.emit("timer_update", timer);
  });

  // Reset to 0
  socket.on("reset_timer", () => {
    console.log("reset_timer");
    timer.running = false;
    timer.time = 0;
    io.emit("timer_update", timer);
  });

  // Set absolute time (seconds)
  socket.on("set_timer", (seconds) => {
    console.log("set_timer", seconds);
    const val = Number(seconds);
    if (!Number.isNaN(val) && val >= 0) {
      timer.time = Math.floor(val);
      io.emit("timer_update", timer);
    }
  });

  // Optional: change mode
  socket.on("set_mode", (mode) => {
    console.log("set_mode", mode);
    if (["countdown", "countup", "clock"].includes(mode)) {
      timer.type = mode;
      io.emit("timer_update", timer);
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
