const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors()); // loosen for dev; restrict in prod

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // allow any origin for LAN testing; lock down in prod
    methods: ["GET", "POST"],
  },
});

// Health check so visiting http://<host>:4000/ returns JSON
app.get("/", (_req, res) => {
  res.status(200).send({ ok: true, service: "open-stage-timer-backend" });
});

let timer = {
  time: 0, // seconds (remaining for countdown / elapsed for countup / seconds since midnight for clock)
  running: false,
  type: "countdown", // "countdown" | "countup" | "clock"
};

// Broadcast every second when running (or always for clock)
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
  // Send current state immediately
  socket.emit("timer_update", timer);

  socket.on("start_timer", (data) => {
    timer = { ...timer, ...data, running: true };
    // Normalize time input
    if (typeof timer.time !== "number" || Number.isNaN(timer.time)) timer.time = 0;
    io.emit("timer_update", timer);
  });

  socket.on("stop_timer", () => {
    timer.running = false;
    io.emit("timer_update", timer);
  });

  socket.on("reset_timer", () => {
    timer.running = false;
    timer.time = 0;
    io.emit("timer_update", timer);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
