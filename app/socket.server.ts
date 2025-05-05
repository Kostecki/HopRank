import { Server } from "socket.io";
import { createServer } from "http";

const httpServer = createServer();
export const io = new Server(httpServer, {
  path: "/ws",
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  socket.on("join-session", (id) => {
    socket.join(`session:${id}`);
  });
});

if (!process.env.VITE) {
  const PORT = Number(process.env.WS_PORT) || 4000;

  httpServer.listen(PORT, () => {
    console.log();
    console.log(`WebSocket server listening on port ${PORT}`);
  });
}
