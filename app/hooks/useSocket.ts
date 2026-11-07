import { useContext } from "react";

import { SocketContext } from "~/context/SocketContext";

/** The app's socket, or null before it's created (e.g. during SSR). */
export const useSocket = () => {
	return useContext(SocketContext);
};
