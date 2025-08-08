import io from "socket.io-client";

// Use env override if set, otherwise current host on 4000
const host = import.meta.env.VITE_BACKEND_URL || `${window.location.hostname}:4000`;

export const socket = io(`http://${host}`, {
  transports: ["websocket", "polling"],
  reconnection: true,
});