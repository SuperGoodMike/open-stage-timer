const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

let timer = {
  time: 0,
  running: false,
  type: "countdown" // or "countup" or "clock"
};

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
