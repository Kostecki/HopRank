import { useEffect } from "react";
import { useRevalidator } from "react-router";

const DEFAULT_INTERVAL_MS = 15000; // 15 seconds

export function useAutoRevalidate(intervalMs: number = DEFAULT_INTERVAL_MS) {
  const { revalidate } = useRevalidator();

  useEffect(() => {
    // Auto revalidate only in production
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    let intervalId: number | undefined;

    const startInterval = () => {
      intervalId = window.setInterval(() => {
        revalidate();
      }, intervalMs);
    };

    const stopInterval = () => {
      if (intervalId !== undefined) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        revalidate();
        startInterval();
      } else {
        stopInterval();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (document.visibilityState === "visible") {
      startInterval();
    }

    return () => {
      stopInterval();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [revalidate, intervalMs]);
}
