import { useState, useCallback } from "react";

type Location = {
  lat: number;
  lng: number;
};

type GeolocationOptions = {
  fallback?: Location;
  highAccuracy?: boolean;
};

export function useGeolocation(options?: GeolocationOptions) {
  const { fallback = { lat: 55.6761, lng: 12.5683 }, highAccuracy = false } =
    options || {};

  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      setLocation(fallback);
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLoading(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setError(err.message);
        setLocation(fallback);
        setLoading(false);
      },
      {
        enableHighAccuracy: highAccuracy,
        maximumAge: 30000,
        timeout: 10000,
      }
    );
  }, [fallback, highAccuracy]);

  return { location, loading, error, requestLocation };
}
