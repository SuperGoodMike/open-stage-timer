import io from "socket.io-client";

const backendHost = import.meta.env.VITE_BACKEND_URL || `${window.location.hostname}:4000`;
export const socket = io(`http://${backendHost}`);