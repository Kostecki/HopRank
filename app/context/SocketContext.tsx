import { createContext, useMemo } from "react";
import { type Socket, io } from "socket.io-client";
import { invariant } from "~/utils/invariant";

export const SocketContext = createContext<Socket | null>(null);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
	const socket = useMemo(() => {
		const WS_URL = import.meta.env.VITE_WS_URL;
		invariant(WS_URL, "VITE_WS_URL must be set in .env");

		console.log("Connecting to WebSocket at:", WS_URL);

		return io(WS_URL, {
			path: "/ws",
			transports: ["websocket"],
		});
	}, []);

	return (
		<SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
	);
};
