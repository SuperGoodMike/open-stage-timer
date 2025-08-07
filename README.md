# Open Stage Timer

A self-hosted real-time countdown/count-up timer app with remote control. Built using React, Node.js, and Socket.IO.

## Run locally

> **Node version**: The frontend is pinned to **Vite 5**, which supports **Node 18+**. If you see an engine warning about Vite 7, run a clean install to ensure Vite 5 is used (see Troubleshooting below).

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
rm -rf node_modules package-lock.json # optional: force clean install
npm install
npm run dev
```
Open `http://localhost:5173/` in your browser.

## Notes
- During development the backend **does not** serve the UI; use the Vite dev server at `http://localhost:5173/`.
- WebSocket CORS is configured for `5173` (Vite) and `3000`.

## Troubleshooting
- **EBADENGINE / Vite 7 wants Node 20+**: You likely pulled Vite 7. The project pins `vite` to `5.4.10`. Do a clean reinstall:
  ```bash
  cd frontend
  rm -rf node_modules package-lock.json
  npm install
  npm run dev
  ```
  You should see `VITE v5.x` in the startup banner.
- **Cannot GET /** at backend root: fixed. You should see a JSON health response now.
- **Sockets blocked**: verify the backend log shows `Backend running on http://localhost:4000` and no firewall blocks port 4000.

## Smoke tests
- With backend running, open two browser tabs to `http://localhost:5173/`. Start a countdown on one tab and watch the other update in real time.
- Switch mode to **Clock** and verify it ticks once per second.
- Hit **Stop** and **Reset**; confirm both tabs update.
