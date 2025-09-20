import { createContext, useMemo } from "react";
import { type Socket, io } from "socket.io-client";

import { invariant } from "~/utils/invariant";

const WS_URL = import.meta.env.VITE_WS_URL;
invariant(WS_URL, "VITE_WS_URL must be set in .env");

export const SocketContext = createContext<Socket | null>(null);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
	const socket = useMemo(() => io(WS_URL, { path: "/ws" }), []);

	return (
		<SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
	);
};
