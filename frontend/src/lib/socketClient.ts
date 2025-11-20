import { io } from "socket.io-client";
import { API_BASE_URL } from "../utils/api";

export const socket = io(API_BASE_URL, {
  autoConnect: false,
  transports: ["websocket"],
  auth: (cb) => {
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem("equitypulse-token")
        : null;
    cb({ token });
  },
});

export const connectSocket = () => {
  if (!socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};
