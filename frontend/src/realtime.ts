import { io, type Socket } from "socket.io-client";

let socket: Socket | undefined;
let activeToken: string | undefined;

export function connectRealtime(token: string) {
  if (!socket || activeToken !== token) {
    socket?.disconnect();
    activeToken = token;
    const wsTarget = import.meta.env.VITE_WS_URL || (typeof window !== "undefined" && window.location.port === "5173" ? "http://localhost:3001" : window.location.origin);
    socket = io(wsTarget, {
      autoConnect: false,
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
    });
    socket.connect();
  }
  return socket;
}

export function disconnectRealtime() {
  socket?.disconnect();
  socket = undefined;
  activeToken = undefined;
}
