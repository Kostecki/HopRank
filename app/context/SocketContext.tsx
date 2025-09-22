import { createContext, useContext, useEffect, useState } from "react";
import { type Socket, io } from "socket.io-client";
import { invariant } from "~/utils/invariant";

export const SocketContext = createContext<Socket | null>(null);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
	const [socket, setSocket] = useState<Socket | null>(null);

	useEffect(() => {
		const WS_URL = import.meta.env.VITE_WS_URL;
		invariant(WS_URL, "VITE_WS_URL must be set in .env");

		console.log("Connecting to WebSocket at:", WS_URL);

		const s = io(WS_URL, {
			path: "/ws",
			transports: ["websocket"],
			autoConnect: true,
		});

		setSocket(s);

		s.on("connect_error", (err) => {
			console.error("WebSocket connection error:", err);
		});

		// Clean up on unmount
		return () => {
			s.disconnect();
			console.log("WebSocket disconnected");
		};
	}, []);

	return (
		<SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
	);
};

// Hook to consume the socket
export const useSocket = () => {
	const socket = useContext(SocketContext);
	invariant(socket, "SocketProvider must wrap your component tree");
	return socket;
};
