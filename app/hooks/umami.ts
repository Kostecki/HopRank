import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

export function useUmamiIdentify(email?: string) {
  const location = useLocation();
  const hasIdentified = useRef(false);

  useEffect(() => {
    console.log("useEffect, umami", email, hasIdentified.current);
    if (!email) return;
    if (location.pathname.startsWith("/auth")) return;

    console.log("useEffect, after", email, hasIdentified.current);

    if (
      !hasIdentified.current &&
      typeof window !== "undefined" &&
      window.umami
    ) {
      console.log("umami if", email, hasIdentified.current);
      window.umami.identify({
        email: email,
      });
      hasIdentified.current = true;
    }
  }, [email, location.pathname]);
}
