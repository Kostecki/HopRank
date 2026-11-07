import type {
	EventArgs,
	GlobalEvent,
	SessionEvent,
	SocketEvent,
} from "~/types/websocket";

import { io } from "~/socket.server";

// socket.io's typed emit can't follow a generic event name, so the argument
// types are checked here, at the call site, instead.
type UntypedEmit = (event: SocketEvent, ...args: unknown[]) => boolean;

/** Sends an event to everyone in the session's room. */
export const emitSessionEvent = <K extends SessionEvent>(
	sessionId: number,
	event: K,
	...args: EventArgs<K>
) => {
	(io.to(`session:${sessionId}`).emit as UntypedEmit)(event, ...args);
};

/** Sends an event to every connected client. */
export const emitGlobalEvent = <K extends GlobalEvent>(
	event: K,
	...args: EventArgs<K>
) => {
	(io.emit as UntypedEmit)(event, ...args);
};
