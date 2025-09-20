import { createContext, useMemo } from "react";
import { type Socket, io } from "socket.io-client";

export const SocketContext = createContext<Socket | null>(null);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
	const socket = useMemo(() => {
		const url = import.meta.env.DEV ? "http://localhost:4000" : undefined;

		return io(url, { path: "/ws", transports: ["websocket"] });
	}, []);

	return (
		<SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
	);
};
