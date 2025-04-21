import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

export function useUmamiIdentify(email?: string) {
  const location = useLocation();
  const hasIdentified = useRef(false);

  useEffect(() => {
    console.log("useEffect running", {
      email,
      hasIdentified: hasIdentified.current,
      pathname: location.pathname,
    });

    if (hasIdentified.current) return;
    if (!email) return;
    if (location.pathname.startsWith("/auth")) return;

    if (typeof window !== "undefined" && window.umami) {
      console.log("Calling umami.identify", { email });
      window.umami.identify({ email });
      hasIdentified.current = true;
    }
  }, [email, location.pathname]);
}
