import type { Socket } from "socket.io-client";

import type {
	ClientToServerEvents,
	ServerToClientEvents,
} from "~/types/websocket";

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Session rooms this socket is in, counted per subscriber. Several components
 * listen to the same session, and the room should stay joined until the last
 * of them unmounts rather than the first.
 */
const roomsBySocket = new WeakMap<AppSocket, Map<number, number>>();

const roomsFor = (socket: AppSocket) => {
	let rooms = roomsBySocket.get(socket);
	if (!rooms) {
		const created = new Map<number, number>();
		rooms = created;
		roomsBySocket.set(socket, created);

		// The server treats a reconnect as a new connection with no rooms, so
		// rejoin every room still in use. Without this, live updates stop after
		// e.g. a phone was backgrounded and reconnected.
		socket.on("connect", () => {
			for (const sessionId of created.keys()) {
				socket.emit("join-session", sessionId);
			}
		});
	}

	return rooms;
};

export function joinSessionRoom(socket: AppSocket, sessionId: number) {
	const rooms = roomsFor(socket);
	const count = rooms.get(sessionId) ?? 0;
	rooms.set(sessionId, count + 1);

	if (count === 0 && socket.connected) {
		socket.emit("join-session", sessionId);
	}
}

export function leaveSessionRoom(socket: AppSocket, sessionId: number) {
	const rooms = roomsFor(socket);
	const count = rooms.get(sessionId) ?? 0;

	if (count <= 1) {
		rooms.delete(sessionId);
		socket.emit("leave-session", sessionId);
	} else {
		rooms.set(sessionId, count - 1);
	}
}
