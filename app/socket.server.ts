import { createServer } from "node:http";
import { Server } from "socket.io";

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

  socket.on("join-session", (id) => {
    socket.join(`session:${id}`);
    console.log(`Socket ${socket.id} joined session:${id}`);
  });

  socket.on("leave-session", (id) => {
    socket.leave(`session:${id}`);
    console.log(`Socket ${socket.id} left session:${id}`);
  });

  socket.on("disconnect", (reason) => {
    console.log();
    console.log("Client Disconnected");
    console.log(" - Client ID:", socket.id);
    console.log(" - Reason:", reason);
    console.log(" - Total Clients:", io.engine.clientsCount);
  });

  socket.on("error", (err) => {
    console.error("Socket error:", err);
  });
});

if (!process.env.VITE) {
  const PORT = 4000;

  httpServer.listen(PORT, () => {
    console.log();
    console.log(`WebSocket server listening on port: ${PORT}`);
  });
}
