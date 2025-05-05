import { useEffect } from "react";

import { useSocket } from "./useSocket";

import { onSessionEvent } from "~/utils/websocket";

import type { SocketEvent, SocketEventMap } from "~/types/websocket";

export const useDebouncedSocketEvent = <K extends SocketEvent>(
  event: K | K[],
  handler: (payload: SocketEventMap[K]) => void,
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
        handler(args[0] as SocketEventMap[typeof e]);
      })
    );

    return () => {
      for (const callback of cleanups) {
        callback();
      }

      if (needsSession && sessionId) {
        socket.emit("leave-session", sessionId);
      }
    };
  }, [socket, event, handler, sessionId, debounceMs]);
};
