import { useCallback, useState } from "react";

type Location = {
  lat: number;
  lng: number;
};

type GeolocationOptions = {
  fallback?: Location;
  highAccuracy?: boolean;
};

function roundTo4Decimals(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function useGeolocation(options?: GeolocationOptions) {
  const { fallback = { lat: 55.6761, lng: 12.5683 }, highAccuracy = false } =
    options || {};

  const [location, setLocation] = useState<Location>({
    lat: roundTo4Decimals(fallback.lat),
    lng: roundTo4Decimals(fallback.lng),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      setLocation({
        lat: roundTo4Decimals(fallback.lat),
        lng: roundTo4Decimals(fallback.lng),
      });
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          lat: roundTo4Decimals(position.coords.latitude),
          lng: roundTo4Decimals(position.coords.longitude),
        };

        setLocation((prev) => {
          if (prev.lat === newLocation.lat && prev.lng === newLocation.lng) {
            return prev;
          }
          return newLocation;
        });

        setLoading(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setError(err.message);
        setLocation({
          lat: roundTo4Decimals(fallback.lat),
          lng: roundTo4Decimals(fallback.lng),
        });
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
