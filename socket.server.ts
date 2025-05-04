import { Server } from "socket.io";
import { createServer } from "http";

const httpServer = createServer();
export const io = new Server(httpServer, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  socket.on("join-session", (id) => {
    socket.join(`session:${id}`);
  });
});

if (!process.env.VITE) {
  let PORT = 4000;

  const WS_URL = import.meta.env.VITE_WS_URL;
  if (WS_URL) {
    const url = new URL(WS_URL);
    PORT = Number(url.port);
  }

  httpServer.listen(PORT, () => {
    console.log();
    console.log(`WebSocket server listening on port ${PORT}`);
  });
}
