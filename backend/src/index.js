const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const RD = require("./rundown");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

app.get("/", (_req, res) => res.status(200).send({ ok: true, service: "open-stage-timer-backend" }));

let timer = { time: 0, running: false, type: "countdown" };
let settings = { beepEnabled: true };
let rundown = RD.createDefaults();

function broadcast() {
  io.emit("timer_update", timer);
  io.emit("settings_update", settings);
  io.emit("rundown_update", rundown);
}

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
    if (timer.time === 0) {
      timer.running = false;
      // auto‑advance logic
      if (rundown.activeIndex !== null) {
        rundown = RD.markDone(rundown, rundown.activeIndex);
        const nxt = RD.nextIndex(rundown);
        if (rundown.autoAdvance && nxt !== null) {
          const id = rundown.items[nxt].id;
          rundown = RD.startItem(rundown, id);
          timer = { time: rundown.items[nxt].durationSec, running: true, type: "countdown" };
        }
        broadcast();
      }
    }
  } else if (timer.type === "countup") {
    timer.time += 1;
  }
  io.emit("timer_update", timer);
}, 1000);

io.on("connection", (socket) => {
  console.log("client connected:", socket.id);
  socket.emit("timer_update", timer);
  socket.emit("settings_update", settings);
  socket.emit("rundown_update", rundown);

  // existing timer controls
  socket.on("start_timer", (payload) => {
    if (payload && typeof payload === "object") {
      if (typeof payload.time === "number") timer.time = Math.max(0, Math.floor(payload.time));
      if (typeof payload.type === "string") timer.type = payload.type;
    }
    timer.running = true;
    broadcast();
  });
  socket.on("pause_timer", () => { timer.running = false; broadcast(); });
  socket.on("reset_timer", () => { timer.running = false; timer.time = 0; broadcast(); });
  socket.on("set_timer", (sec) => { const v = Number(sec); if (!Number.isNaN(v) && v >= 0) timer.time = Math.floor(v); broadcast(); });
  socket.on("set_mode", (mode) => { if (["countdown","countup","clock"].includes(mode)) timer.type = mode; broadcast(); });

  // beep setting
  socket.on("set_beep_enabled", (flag) => { settings.beepEnabled = !!flag; io.emit("settings_update", settings); });

  // RUNDOWN API
  socket.on("rundown_add_item", (partial) => { rundown = RD.addItem(rundown, partial || {}); io.emit("rundown_update", rundown); });
  socket.on("rundown_update_item", ({ id, patch }) => { rundown = RD.updateItem(rundown, id, patch || {}); io.emit("rundown_update", rundown); });
  socket.on("rundown_remove_item", (id) => { rundown = RD.removeItem(rundown, id); io.emit("rundown_update", rundown); });
  socket.on("rundown_reorder", (ids) => { rundown = RD.reorder(rundown, Array.isArray(ids) ? ids : []); io.emit("rundown_update", rundown); });
  socket.on("rundown_set_auto_advance", (flag) => { rundown.autoAdvance = !!flag; io.emit("rundown_update", rundown); });
  socket.on("rundown_set_viewer_title_stripe", (flag) => { rundown.showViewerTitleStripe = !!flag; io.emit("rundown_update", rundown); });
  socket.on("rundown_start_item", (id) => {
    const before = rundown;
    rundown = RD.startItem(rundown, id);
    if (rundown.activeIndex !== null) {
      const item = rundown.items[rundown.activeIndex];
      timer = { time: item.durationSec, running: true, type: "countdown" };
    }
    if (before !== rundown) broadcast();
  });
  socket.on("rundown_next", () => {
    const nxt = RD.nextIndex(rundown);
    if (nxt !== null) {
      const id = rundown.items[nxt].id;
      rundown = RD.startItem(rundown, id);
      const item = rundown.items[nxt];
      timer = { time: item.durationSec, running: true, type: "countdown" };
      broadcast();
    }
  });
  socket.on("rundown_prev", () => {
    if (rundown.activeIndex === null) return;
    const p = rundown.activeIndex - 1;
    if (p >= 0) {
      const id = rundown.items[p].id;
      rundown = RD.startItem(rundown, id);
      const item = rundown.items[p];
      timer = { time: item.durationSec, running: true, type: "countdown" };
      broadcast();
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));