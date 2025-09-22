import { createServer } from "node:http";
import { Server } from "socket.io";

const httpServer = createServer();
export const io = new Server(httpServer, {
  path: "/ws",
  cors: { origin: "*" },
  transports: ["websocket"],
});

io.on("connection", (socket) => {
  console.log("client connected:", socket.id);

  socket.on("join-session", (id) => {
    socket.join(`session:${id}`);
    console.log(`socket ${socket.id} joined session:${id}`);
  });

  socket.on("disconnect", (reason) => {
    console.log("client disconnected:", socket.id, "reason:", reason);
    console.log(io.engine.clientsCount, "clients still connected");
  });
});

if (!process.env.VITE) {
  const PORT = 4000;

  httpServer.listen(PORT, () => {
    console.log();
    console.log(`WebSocket server listening on port ${PORT}`);
    console.log();
  });
}
