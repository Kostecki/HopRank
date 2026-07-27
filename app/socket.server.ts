import { createServer } from "node:http";
import { Server } from "socket.io";

import { invariant } from "~/utils/invariant";

const WS_URL = import.meta.env.VITE_WS_URL;

const APP_URL = process.env.APP_URL;
invariant(APP_URL, "APP_URL must be set in .env");

const httpServer = createServer();
export const io = new Server(httpServer, {
	path: "/ws",
	cors: { origin: APP_URL },
	transports: ["websocket"],
});

io.on("connection", (socket) => {
	console.log();
	console.log("[WS] Client Connected");
	console.log(" - Client ID:", socket.id);
	console.log(" - Total Clients:", io.engine.clientsCount);
	console.log();

	io.emit("clients-count", io.engine.clientsCount);

	socket.on("join-session", (id) => {
		socket.join(`session:${id}`);
		console.log();
		console.log(`[WS] Client ${socket.id} joined session: ${id}`);
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
