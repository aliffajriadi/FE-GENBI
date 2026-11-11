"use client";
import { io, type Socket } from "socket.io-client";
import { accessToken, API_ORIGIN, tryRefresh } from "./api";

// Satu koneksi Socket.IO untuk seluruh tab; token dibaca ulang tiap (re)connect karena access token berumur 15 menit.
let socket: Socket | null = null;

export function getSocket() {
  if (socket) return socket;
  socket = io(API_ORIGIN || location.origin, { path: "/socket.io", auth: (cb) => cb({ token: accessToken() }), transports: ["websocket", "polling"] });
  socket.on("connect_error", async (err) => {
    if (err.message === "UNAUTHENTICATED" && (await tryRefresh())) socket?.connect();
  });
  return socket;
}
