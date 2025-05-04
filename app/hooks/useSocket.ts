import { useContext } from "react";
import { SocketContext } from "~/context/SocketContext";

// Global socket access
export const useSocket = () => {
  return useContext(SocketContext);
};
