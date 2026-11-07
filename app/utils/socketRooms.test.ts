import { describe, expect, it } from "vitest";

import {
	type AppSocket,
	joinSessionRoom,
	leaveSessionRoom,
} from "./socketRooms";

/** Just enough of a socket: records emits and lets the test fire "connect". */
function fakeSocket(connected = true) {
	const emitted: [string, number][] = [];
	const listeners: Record<string, (() => void)[]> = {};

	const socket = {
		connected,
		emit: (event: string, sessionId: number) => {
			emitted.push([event, sessionId]);
		},
		on: (event: string, listener: () => void) => {
			listeners[event] = [...(listeners[event] ?? []), listener];
		},
		reconnect() {
			this.connected = true;
			for (const listener of listeners.connect ?? []) listener();
		},
	};

	return { socket, asApp: socket as unknown as AppSocket, emitted };
}

describe("session rooms", () => {
	it("joins once and leaves only when the last subscriber leaves", () => {
		const { asApp, emitted } = fakeSocket();

		joinSessionRoom(asApp, 1);
		joinSessionRoom(asApp, 1);
		expect(emitted).toEqual([["join-session", 1]]);

		leaveSessionRoom(asApp, 1);
		expect(emitted).toEqual([["join-session", 1]]);

		leaveSessionRoom(asApp, 1);
		expect(emitted).toEqual([
			["join-session", 1],
			["leave-session", 1],
		]);
	});

	it("rejoins rooms still in use after a reconnect", () => {
		const { socket, asApp, emitted } = fakeSocket(false);

		joinSessionRoom(asApp, 1);
		joinSessionRoom(asApp, 2);
		leaveSessionRoom(asApp, 2);
		expect(emitted).toEqual([["leave-session", 2]]);

		socket.reconnect();
		expect(emitted).toEqual([
			["leave-session", 2],
			["join-session", 1],
		]);
	});
});
