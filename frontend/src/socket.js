// frontend/src/socket.js
import io from "socket.io-client";

// Use env override if provided, otherwise the current host on port 4000
const host = import.meta.env.VITE_BACKEND_URL || `${window.location.hostname}:4000`;

export const socket = io(`http://${host}`, {
  // allow fallback; websocket first, then polling
  transports: ["websocket", "polling"],
  reconnection: true,
});
