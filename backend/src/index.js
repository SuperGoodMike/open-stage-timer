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

// Ensure split flags exist once; fall back to legacy only if split is absent
if (
  typeof rundown.showViewerTitle !== "boolean" ||
  typeof rundown.showViewerStripe !== "boolean"
) {
  const legacy = !!rundown.showViewerTitleStripe;
  rundown.showViewerTitle  = typeof rundown.showViewerTitle  === "boolean" ? rundown.showViewerTitle  : legacy;
  rundown.showViewerStripe = typeof rundown.showViewerStripe === "boolean" ? rundown.showViewerStripe : legacy;
}

// NEW: messages state
let messages = {
  items: [],
  activeId: null
};

// helper: id generator for messages
const mkid = () => Math.random().toString(36).slice(2, 9);

// single place to broadcast everything
function broadcast() {
  io.emit("timer_update", timer);
  io.emit("settings_update", settings);
  io.emit("rundown_update", rundown);
  io.emit("messages_update", messages);
}

// ---- Ticker ----
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

      if (rundown.activeIndex !== null) {
        rundown = RD.markDone(rundown, rundown.activeIndex);
        const nxt = RD.nextIndex(rundown);
        const canAuto = rundown.autoAdvance && nxt !== null;

        if (canAuto) {
          const nextItem = rundown.items[nxt];
          const nextDur = Math.max(0, Number(nextItem?.durationSec) || 0);
          if (nextDur > 0) {
            rundown = RD.startItem(rundown, nextItem.id);
            timer = { time: nextDur, running: true, type: "countdown" };
          } else {
            rundown.activeIndex = null;
          }
        }
        broadcast();
        return; // avoid duplicate timer_update below
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
  socket.emit("messages_update", messages);

  // ===== Timer controls =====
  socket.on("start_timer", (payload) => {
    if (payload && typeof payload === "object") {
      if (typeof payload.time === "number") timer.time = Math.max(0, Math.floor(payload.time));
      if (typeof payload.type === "string")  timer.type = payload.type;
    }
    timer.running = true;
    broadcast();
  });

  socket.on("pause_timer", () => { timer.running = false; broadcast(); });
  socket.on("reset_timer", () => { timer.running = false; timer.time = 0; broadcast(); });
  socket.on("set_timer", (sec) => {
    const v = Number(sec);
    if (!Number.isNaN(v) && v >= 0) timer.time = Math.floor(v);
    broadcast();
  });
  socket.on("set_mode", (mode) => {
    if (["countdown","countup","clock"].includes(mode)) timer.type = mode;
    broadcast();
  });

  // beep setting
  socket.on("set_beep_enabled", (flag) => {
    settings.beepEnabled = !!flag;
    io.emit("settings_update", settings);
  });

  // ===== RUNDOWN API =====
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

  socket.on("rundown_reorder", (ids) => {
    rundown = RD.reorder(rundown, Array.isArray(ids) ? ids : []);
    io.emit("rundown_update", rundown);
  });

  socket.on("rundown_set_auto_advance", (flag) => {
    rundown.autoAdvance = !!flag;
    io.emit("rundown_update", rundown);
  });

  // NEW: split toggles
  socket.on("rundown_set_viewer_title",  (flag) => {
    rundown.showViewerTitle = !!flag;
    io.emit("rundown_update", rundown);
  });
  socket.on("rundown_set_viewer_stripe", (flag) => {
    rundown.showViewerStripe = !!flag;
    io.emit("rundown_update", rundown);
  });

  // (optional legacy support; map old combined toggle to both)
  //socket.on("rundown_set_viewer_title_stripe", (flag) => {
    //const v = !!flag;
    //rundown.showViewerTitle  = v;
    //rundown.showViewerStripe = v;
    //io.emit("rundown_update", rundown);
  //});


  socket.on("rundown_start_item", (id) => {
    const before = rundown;
    rundown = RD.startItem(rundown, id);
    if (rundown.activeIndex !== null) {
      const item = rundown.items[rundown.activeIndex];
      timer = { time: Math.max(0, Number(item.durationSec) || 0), running: true, type: "countdown" };
    }
    if (before !== rundown) broadcast();
  });

  socket.on("rundown_next", () => {
    const nxt = RD.nextIndex(rundown);
    if (nxt !== null) {
      const id = rundown.items[nxt].id;
      rundown = RD.startItem(rundown, id);
      const item = rundown.items[nxt];
      timer = { time: Math.max(0, Number(item.durationSec) || 0), running: true, type: "countdown" };
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
      timer = { time: Math.max(0, Number(item.durationSec) || 0), running: true, type: "countdown" };
      broadcast();
    }
  });

  // ===== Messages API =====
  socket.on("message_add", (text) => {
    const t = String(text || "").slice(0, 400);
    const item = { id: mkid(), text: t };
    messages.items = [...messages.items, item];
    io.emit("messages_update", messages);
  });

  socket.on("message_update", ({ id, text }) => {
    messages.items = messages.items.map((m) =>
      m.id === id ? { ...m, text: String(text || "").slice(0, 400) } : m
    );
    io.emit("messages_update", messages);
  });

  socket.on("message_remove", (id) => {
    messages.items = messages.items.filter((m) => m.id !== id);
    if (messages.activeId === id) messages.activeId = null;
    io.emit("messages_update", messages);
  });

  socket.on("message_reorder", (ids) => {
    const map = new Map(messages.items.map((m) => [m.id, m]));
    messages.items = (Array.isArray(ids) ? ids : [])
      .map((id) => map.get(id))
      .filter(Boolean);
    io.emit("messages_update", messages);
  });

  socket.on("message_show", (id) => {
    if (messages.items.find((m) => m.id === id)) messages.activeId = id;
    io.emit("messages_update", messages);
  });

  socket.on("message_hide", () => {
    messages.activeId = null;
    io.emit("messages_update", messages);
  });
});

// ---- Start server ----
const PORT = process.env.PORT || 4000;
server.listen(PORT, () =>
  console.log(`Backend running on http://localhost:${PORT}`)
);
