import { useCallback, useEffect, useRef } from "react";

import type { SocketEvent, SocketEventMap } from "~/types/websocket";

import { onSessionEvent } from "~/utils/websocket";

import { useSocket } from "./useSocket";

export const useDebouncedSocketEvent = <K extends SocketEvent>(
  event: K | K[],
  handler: (payload: SocketEventMap[K]) => void,
  sessionId?: number | string,
  debounceMs = 100
) => {
  const socket = useSocket();
  const handlerRef = useRef(handler);
  const timers = useRef<Record<string, NodeJS.Timeout>>({});

  // Keep the latest handler in a ref to avoid re-subscribing
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  const debouncedHandler = useCallback(
    (e: K, payload: SocketEventMap[K]) => {
      if (timers.current[e]) clearTimeout(timers.current[e]);
      timers.current[e] = setTimeout(() => {
        handlerRef.current(payload);
        delete timers.current[e];
      }, debounceMs);
    },
    [debounceMs]
  );

  useEffect(() => {
    const events = Array.isArray(event) ? event : [event];
    const needsSession = events.some((e) => e.startsWith("session:"));

    if (!socket || (needsSession && !sessionId)) return;

    if (needsSession && sessionId) {
      socket.emit("join-session", sessionId);
    }

    const cleanups = events.map((e) =>
      onSessionEvent(socket, e, (payload) =>
        debouncedHandler(e, payload as SocketEventMap[K])
      )
    );

    return () => {
      // Remove listeners
      for (const fn of cleanups) {
        fn();
      }

      // Leave session if needed
      if (needsSession && sessionId) {
        socket.emit("leave-session", sessionId);
      }

      // Clear any pending timers
      Object.values(timers.current).forEach(clearTimeout);
      timers.current = {};
    };
  }, [socket, event, sessionId, debouncedHandler]);
};
