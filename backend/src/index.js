const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const Engine = require("./engine");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

app.get("/", (_req, res) => {
  res.status(200).send({ ok: true, service: "open-stage-timer-backend" });
});

let timer = Engine.createInitialState();
let settings = {
  beepEnabled: true,
};
setInterval(() => {
  timer = Engine.tick(timer);
  io.emit("timer_update", timer);
}, 1000);

io.on("connection", (socket) => {
  console.log("client connected:", socket.id);
  socket.emit("timer_update", timer);
  socket.emit("settings_update", settings); // 👈 send current settings to each client

  socket.on("start_timer", (payload) => {
    timer = Engine.start(timer, payload || {});
    io.emit("timer_update", timer);
  });

  socket.on("pause_timer", () => {
    timer = Engine.pause(timer);
    io.emit("timer_update", timer);
  });

  socket.on("reset_timer", () => {
    timer = Engine.reset(timer);
    io.emit("timer_update", timer);
  });

  socket.on("set_timer", (seconds) => {
    timer = Engine.setTime(timer, seconds);
    io.emit("timer_update", timer);
  });

  socket.on("set_mode", (mode) => {
    timer = Engine.setMode(timer, mode);
    io.emit("timer_update", timer);
  });
  // NEW: enable/disable beep (from controller)
  socket.on("set_beep_enabled", (flag) => {
    const prev = settings.beepEnabled;
    settings.beepEnabled = !!flag;
    console.log("set_beep_enabled", prev, "->", settings.beepEnabled);
    io.emit("settings_update", settings); // broadcast to all viewers/controllers
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});