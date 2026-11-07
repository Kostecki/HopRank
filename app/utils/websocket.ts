import type { SocketEvent, SocketEventMap } from "~/types/websocket";

import type { AppSocket } from "./socketRooms";

/** Listens for an app event. Returns a function that stops listening. */
export const onSessionEvent = <K extends SocketEvent>(
	socket: AppSocket,
	event: K,
	handler: (payload: SocketEventMap[K]) => void,
) => {
	// socket.io's typed overloads can't follow a generic event name.
	const listener = handler as (...args: unknown[]) => void;
	socket.on(event as SocketEvent, listener as never);

	return () => {
		socket.off(event as SocketEvent, listener as never);
	};
};
