// Backend: backend/src/index.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors()); // allow all origins for dev, tighten later

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST"]
  }
});

// Simple health route so hitting http://localhost:4000 shows something
app.get("/", (_req, res) => {
  res.status(200).send({ ok: true, service: "open-stage-timer-backend" });
});

let timer = {
  time: 0, // seconds remaining/elapsed depending on mode
  running: false,
  type: "countdown" // or "countup" or "clock"
};

// Tick every 1s when running
setInterval(() => {
  if (!timer.running) return;
  if (timer.type === "countdown") {
    timer.time = Math.max(0, timer.time - 1);
    if (timer.time === 0) timer.running = false;
  } else if (timer.type === "countup") {
    timer.time += 1;
  } else if (timer.type === "clock") {
    // keep sending current time-of-day in seconds since midnight
    const now = new Date();
    timer.time = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  }
  io.emit("timer_update", timer);
}, 1000);

io.on("connection", (socket) => {
  socket.emit("timer_update", timer);

  socket.on("start_timer", (data) => {
    timer = { ...timer, ...data, running: true };
    io.emit("timer_update", timer);
  });

  socket.on("stop_timer", () => {
    timer.running = false;
    io.emit("timer_update", timer);
  });

  socket.on("reset_timer", () => {
    timer.time = 0;
    timer.running = false;
    io.emit("timer_update", timer);
  });
});

server.listen(4000, () => {
  console.log("Backend running on http://localhost:4000");
});