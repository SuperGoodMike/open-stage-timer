const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const RD = require("./rundown");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

app.get("/", (_req, res) =>
  res.status(200).send({ ok: true, service: "open-stage-timer-backend" })
);

// ---- Top-level state ----
let timer = { time: 0, running: false, type: "countdown" };
let settings = { beepEnabled: true };
let rundown = RD.createDefaults();

// NEW: messages state (for controller right column + viewer overlay)
let messages = {
  items: [],          // [{ id, text }]
  activeId: null      // id of message currently shown on viewer (null = none)
};

// helper: id generator for messages
const mkid = () => Math.random().toString(36).slice(2, 9);

// single place to broadcast everything
function broadcast() {
  io.emit("timer_update", timer);
  io.emit("settings_update", settings);
  io.emit("rundown_update", rundown);
  io.emit("messages_update", messages);  // NEW
}

// ---- Ticker ----
setInterval(() => {
  if (timer.type === "clock") {
    const now = new Date();
    timer.time =
      now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    io.emit("timer_update", timer);
    return;
  }
  if (!timer.running) return;

  if (timer.type === "countdown") {
    timer.time = Math.max(0, timer.time - 1);
    if (timer.time === 0) {
      timer.running = false;
      // auto-advance logic
      if (rundown.activeIndex !== null) {
        rundown = RD.markDone(rundown, rundown.activeIndex);
        const nxt = RD.nextIndex(rundown);
        if (rundown.autoAdvance && nxt !== null) {
          const id = rundown.items[nxt].id;
          rundown = RD.startItem(rundown, id);
          timer = {
            time: rundown.items[nxt].durationSec,
            running: true,
            type: "countdown",
          };
        }
        broadcast();
      }
    }
  } else if (timer.type === "countup") {
    timer.time += 1;
  }

  io.emit("timer_update", timer);
}, 1000);

// ---- Sockets ----
io.on("connection", (socket) => {
  console.log("client connected:", socket.id);

  // initial state push
  socket.emit("timer_update", timer);
  socket.emit("settings_update", settings);
  socket.emit("rundown_update", rundown);
  socket.emit("messages_update", messages); // NEW

  // Timer controls
  socket.on("start_timer", (payload) => {
    if (payload && typeof payload === "object") {
      if (typeof payload.time === "number")
        timer.time = Math.max(0, Math.floor(payload.time));
      if (typeof payload.type === "string") timer.type = payload.type;
    }
    timer.running = true;
    broadcast();
  });
  socket.on("pause_timer", () => {
    timer.running = false;
    broadcast();
  });
  socket.on("reset_timer", () => {
    timer.running = false;
    timer.time = 0;
    broadcast();
  });
  socket.on("set_timer", (sec) => {
    const v = Number(sec);
    if (!Number.isNaN(v) && v >= 0) timer.time = Math.floor(v);
    broadcast();
  });
  socket.on("set_mode", (mode) => {
    if (["countdown", "countup", "clock"].includes(mode)) timer.type = mode;
    broadcast();
  });

  // Beep setting
  socket.on("set_beep_enabled", (flag) => {
    settings.beepEnabled = !!flag;
    io.emit("settings_update", settings);
  });

  // RUNDOWN API
  socket.on("rundown_add_item", (partial) => {
    rundown = RD.addItem(rundown, partial || {});
    io.emit("rundown_update", rundown);
  });
  socket.on("rundown_update_item", ({ id, patch }) => {
    rundown = RD.updateItem(rundown, id, patch || {});
    io.emit("rundown_update", rundown);
  });
  socket.on("rundown_remove_item", (id) => {
    rundown = RD.removeItem(rundown, id);
    io.emit("rundown_update", rundown);
  });