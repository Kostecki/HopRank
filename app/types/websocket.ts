export type SocketEventMap = {
  "session:users-changed": undefined;
  "session:beer-changed": undefined;
  "session:vote": undefined;
  "sessions:created": { sessionId: number };
  "sessions:deleted": { sessionId: number };
  "sessions:users-changed": { sessionId: number };
  "sessions:beer-changed": { sessionId: number };
};

export type SocketEvent = keyof SocketEventMap;
