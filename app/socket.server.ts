import { createServer } from "node:http";
import { Server } from "socket.io";

const WS_URL = import.meta.env.VITE_WS_URL;

const httpServer = createServer();
export const io = new Server(httpServer, {
  path: "/ws",
  cors: { origin: "*" },
  transports: ["websocket"],
});

io.on("connection", (socket) => {
  console.log();
  console.log("Client Connected");
  console.log(" - Client ID:", socket.id);
  console.log(" - Total Clients:", io.engine.clientsCount);
  console.log();

  io.emit("clients-count", io.engine.clientsCount);

  socket.on("join-session", (id) => {
    socket.join(`session:${id}`);
    console.log();
    console.log(`Client ${socket.id} joined session: ${id}`);
  });

  socket.on("leave-session", (id) => {
    socket.leave(`session:${id}`);
    console.log(`Client ${socket.id} left session: ${id}`);
  });

  socket.on("disconnect", (reason) => {
    console.log();
    console.log("Client Disconnected");
    console.log(" - Client ID:", socket.id);
    console.log(" - Reason:", reason);
    console.log(" - Total Clients:", io.engine.clientsCount);
    console.log();
  });

  socket.on("error", (err) => {
    console.error("Socket error:", err);
  });
});

if (!process.env.VITE) {
  let PORT = 4000;
  const url = new URL(WS_URL);
  if (url.port) {
    PORT = Number(url.port);
  }

  httpServer.listen(PORT, () => {
    console.log();
    console.log(`WebSocket server active on: ${WS_URL}`);
  });
}
