import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

export function useUmamiIdentify(email?: string) {
  const location = useLocation();
  const hasIdentified = useRef(false);

  useEffect(() => {
    if (!email) return;
    if (location.pathname.startsWith("/auth")) return;

    if (
      !hasIdentified.current &&
      typeof window !== "undefined" &&
      window.umami
    ) {
      window.umami.identify({
        email: email,
      });
      hasIdentified.current = true;
    }
  }, [email, location.pathname]);
}
