export type SocketEventMap = {
  // Session-scoped events
  "session:users-changed": undefined;
  "session:beer-changed": undefined;
  "session:vote": undefined;

  // Global events
  "sessions:created": { sessionId: number };
  "sessions:deleted": { sessionId: number };
  "sessions:users-changed": { sessionId: number };
  "sessions:beer-changed": { sessionId: number };
};

export type SocketEvent = keyof SocketEventMap;

// Session-specific events (start with "session:")
export type SessionEvent = Extract<SocketEvent, `session:${string}`>;

// Global events (everything else)
export type GlobalEvent = Exclude<SocketEvent, SessionEvent>;
