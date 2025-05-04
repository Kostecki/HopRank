import type { Socket } from "socket.io-client";

import type { SocketEvent } from "~/types/websocket";

export const onSessionEvent = (
  socket: Socket,
  event: SocketEvent,
  handler: (...args: any[]) => void
) => {
  socket.on(event, handler);

  return () => {
    socket.off(event, handler);
  };
};
