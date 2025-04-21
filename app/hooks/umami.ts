import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

export function useUmamiIdentify(email?: string) {
  const location = useLocation();
  const hasIdentified = useRef(false);

  useEffect(() => {
    if (hasIdentified.current) return;
    if (!email) return;
    if (location.pathname.startsWith("/auth")) return;

    if (typeof window !== "undefined" && window.umami) {
      window.umami.identify({ email });
      hasIdentified.current = true;
    }
  }, [email, location.pathname]);
}
