# Open Stage Timer

A self-hosted real-time countdown/count-up timer app with remote control. Built using React, Node.js, and Socket.IO.

## Run locally

### 1) Backend (API/WebSocket)
```bash
cd backend
npm install
npm start
```
- Visit `http://localhost:4000/` to see `{ ok: true, service: "open-stage-timer-backend" }`.

### 2) Frontend (Vite dev server)
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173/` in your browser.

## Notes
- Seeing **"Cannot GET /"** at `http://localhost:4000/` is now replaced by a JSON health response. The backend does not serve the UI; the UI is at `http://localhost:5173/` during development.
- WebSocket CORS is configured for `5173` (Vite) and `3000` (alternative dev port).

## Smoke tests
- With backend running, open two browser tabs to `http://localhost:5173/`. Start a countdown on one tab and watch the other update in real-time.
- Change the mode to **Clock** and confirm it ticks every second.
- Press **Stop** and **Reset** to ensure timer state broadcasts to all tabs.
