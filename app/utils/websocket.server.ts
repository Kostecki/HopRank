import type { GlobalEvent, SessionEvent } from "~/types/websocket";

import { io } from "~/socket.server";

export const emitSessionEvent = (
  sessionId: number,
  event: SessionEvent,
  payload?: unknown
) => {
  const room = `session:${sessionId}`;
  io.to(room).emit(event, payload);
};

export const emitGlobalEvent = (event: GlobalEvent, payload?: unknown) => {
  io.emit(event, payload);
};
