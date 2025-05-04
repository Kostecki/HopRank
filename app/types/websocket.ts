export type GlobalEvent =
  | "sessions:created"
  | "sessions:deleted"
  | "sessions:users-changed"
  | "sessions:beer-changed";

export type SessionEvent =
  | "session:users-changed"
  | "session:vote"
  | "session:beer-changed";

export type SocketEvent = GlobalEvent | SessionEvent;
