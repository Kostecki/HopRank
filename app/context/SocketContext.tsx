import { createContext, useContext, useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

import { invariant } from "~/utils/invariant";

export const SocketContext = createContext<Socket | null>(null);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
	const [socket, setSocket] = useState<Socket | null>(null);

	useEffect(() => {
		const WS_URL = import.meta.env.VITE_WS_URL;
		invariant(WS_URL, "VITE_WS_URL must be set in .env");

		const s = io(WS_URL, {
			path: "/ws",
			transports: ["websocket"],
			autoConnect: true,
			reconnection: true,
			// No reconnectionAttempts cap: a fixed cap (previously 12 attempts *
			// 5s = ~60s) can be exhausted while a phone is locked/backgrounded
			// between beers, permanently giving up until a manual page reload.
			reconnectionDelay: 5000, // wait 5s between attempts
		});

		setSocket(s);

		// Connection established
		s.on("connect", () => {
			console.log("[WS] WebSocket Connected");
			console.log(" - Server:", WS_URL);
			console.log(" - Client ID:", s.id);
		});

		// Connection lost / reconnecting
		s.on("disconnect", (reason) => {
			console.warn("[WS] WebSocket disconnected. Reason:", reason);
		});

		// Handle connection errors
		s.on("connect_error", (err) => {
			console.error("[WS] WebSocket connection error:", err);
		});

		// Mobile browsers commonly suspend timers (including the automatic
		// reconnection backoff above) while a tab is backgrounded, so the
		// socket can still be sitting disconnected once the tab is visible
		// again. Force a fresh connection attempt on resume rather than
		// waiting for a timer that may never have fired.
		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible" && !s.connected) {
				s.connect();
			}
		};
		document.addEventListener("visibilitychange", handleVisibilityChange);

		// Clean up
		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			s.disconnect();
			console.log("[WS] WebSocket disconnected (cleanup)");
		};
	}, []);

	return (
		<SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
	);
};

// Hook to consume socket
export const useSocket = () => {
	const socket = useContext(SocketContext);
	invariant(socket, "SocketProvider must wrap your component tree");
	return socket;
};
