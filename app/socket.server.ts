import { createServer } from "node:http";
import { Server } from "socket.io";

import type {
	ClientToServerEvents,
	ServerToClientEvents,
} from "~/types/websocket";

import { canFollowSession } from "~/database/utils/assertSessionAccess.server";
import { env } from "~/utils/env.server";
import { computeTally, getActiveKickVote } from "~/utils/kickVoteState.server";

const WS_URL = import.meta.env.VITE_WS_URL;

// Vite's dev server re-evaluates this module from scratch on some edits (a
// full SSR "program reload" rather than a targeted HMR swap). Recreating and
// re-listening on every reload would crash with EADDRINUSE, since the
// previous instance is still bound to the port -- so the server is stashed
// on globalThis (which survives module-graph invalidation, unlike normal
// module-scope state) and only ever created once per process.
type AppServer = Server<ClientToServerEvents, ServerToClientEvents>;

declare global {
	var __hopRankSocket:
		| { httpServer: ReturnType<typeof createServer>; io: AppServer }
		| undefined;
}

function createSocketServer() {
	const httpServer = createServer();
	const io: AppServer = new Server(httpServer, {
		path: "/ws",
		cors: { origin: env.APP_URL },
		transports: ["websocket"],
	});

	io.on("connection", (socket) => {
		console.log();
		console.log("[WS] Client Connected");
		console.log(" - Client ID:", socket.id);
		console.log(" - Total Clients:", io.engine.clientsCount);
		console.log();

		io.emit("clients-count", io.engine.clientsCount);

		socket.on("join-session", async (id) => {
			const sessionId = Number(id);
			if (!Number.isSafeInteger(sessionId) || sessionId <= 0) return;

			// The app and /ws share a host, so the handshake carries the same
			// cookies as a page request: the login and any screen-link grant.
			const request = new Request(env.APP_URL, {
				headers: { cookie: socket.handshake.headers.cookie ?? "" },
			});
			if (!(await canFollowSession(request, sessionId))) {
				console.log(`[WS] Client ${socket.id} denied session: ${sessionId}`);
				return;
			}

			socket.join(`session:${sessionId}`);
			console.log();
			console.log(`[WS] Client ${socket.id} joined session: ${sessionId}`);

			// Catch up a (re)joining socket on an in-progress kick vote for this
			// session. The client applies the same eligibility checks to this
			// replayed state as it would to a live-pushed event.
			const activeVote = getActiveKickVote(sessionId);
			if (activeVote) {
				socket.emit("session:kick-vote-started", computeTally(activeVote));
			}
		});

		socket.on("leave-session", (id) => {
			socket.leave(`session:${id}`);
			console.log(`[WS] Client ${socket.id} left session: ${id}`);
		});

		socket.on("disconnect", (reason) => {
			console.log();
			console.log("[WS] Client Disconnected");
			console.log(" - Client ID:", socket.id);
			console.log(" - Reason:", reason);
			console.log(" - Total Clients:", io.engine.clientsCount);
			console.log();

			io.emit("clients-count", io.engine.clientsCount);
		});

		socket.on("error", (err) => {
			console.error("[WS] Socket error:", err);
		});
	});

	if (!process.env.VITE) {
		let PORT = 4000;
		const url = new URL(WS_URL);
		if (url.port) {
			PORT = Number(url.port);
		}

		httpServer.listen(PORT, () => {
			console.log();
			console.log(`[WS] Server active on: ${WS_URL}`);
			console.log();
		});
	}

	return { httpServer, io };
}

const socketServer = globalThis.__hopRankSocket ?? createSocketServer();
globalThis.__hopRankSocket = socketServer;

export const io = socketServer.io;
