import { useEffect } from "react";

import { useSocket } from "./useSocket";

import { onSessionEvent } from "~/utils/websocket";

import type { SocketEvent } from "~/types/websocket";

export const useDebouncedSocketEvent = (
  event: SocketEvent | SocketEvent[],
  handler: (...args: any[]) => void,
  sessionId?: number | string,
  debounceMs = 100
) => {
  const socket = useSocket();

  useEffect(() => {
    const events = Array.isArray(event) ? event : [event];
    const needsSession = events.some((e) => e.startsWith("session:"));

    if (!socket || (needsSession && !sessionId)) return;

    if (needsSession && sessionId) {
      socket.emit("join-session", sessionId);
    }

    const cleanups = events.map((e) =>
      onSessionEvent(socket, e, async (...args) => {
        await new Promise((r) => setTimeout(r, debounceMs));
        handler(...args);
      })
    );

    return () => {
      cleanups.forEach((c) => c());

      if (needsSession && sessionId) {
        socket.emit("leave-session", sessionId);
      }
    };
  }, [socket, event, handler, sessionId, debounceMs]);
};
