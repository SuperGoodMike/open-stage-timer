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
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});