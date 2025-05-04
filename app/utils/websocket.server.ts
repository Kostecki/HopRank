import { io } from "socket.server";
import type { GlobalEvent, SessionEvent } from "~/types/websocket";

export const emitSessionEvent = (
  sessionId: number,
  event: SessionEvent,
  payload?: any
) => {
  const room = `session:${sessionId}`;
  io.to(room).emit(event, payload);
};

export const emitGlobalEvent = (event: GlobalEvent, payload?: any) => {
  io.emit(event, payload);
};
