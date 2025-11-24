import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FetcherWithComponents } from "react-router";

import type { SessionProgress } from "~/types/session";
import type { SessionUser } from "~/types/user";

import { showDangerToast } from "~/utils/toasts";
import { getGmtOffset, isMobileOrTablet } from "~/utils/utils";

import { useGeolocation } from "./useGeolocation";

type UntappdFetcher = FetcherWithComponents<unknown>;

type UseUntappdCheckinArgs = {
  session: SessionProgress;
  user: SessionUser;
  untappdFetcher: UntappdFetcher;
};

type UseUntappdCheckinReturn = {
  isEnabled: boolean;
  setIsEnabled: (value: boolean) => void;
  includeScore: boolean;
  setIncludeScore: (value: boolean) => void;
  openInUntappd: boolean;
  setOpenInUntappd: (value: boolean) => void;
  selectedVenue: string;
  setSelectedVenue: (value: string) => void;
  comment: string;
  setComment: (value: string) => void;
  checkinId: number | null;
  submitCheckin: (totalScore: number) => void;
  openInApp: () => void;
  location: { lat: number; lng: number };
  isMobile: boolean;
};

export function useUntappdCheckin({
  session,
  user,
  untappdFetcher,
}: UseUntappdCheckinArgs): UseUntappdCheckinReturn {
  const [isEnabled, setIsEnabled] = useState(false);
  const [includeScore, setIncludeScore] = useState(true);
  const [openInUntappd, setOpenInUntappd] = useState(true);
  const [selectedVenue, setSelectedVenue] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [checkinId, setCheckinId] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const { location, requestLocation } = useGeolocation();
  const hasRequestedLocation = useRef(false);

  useEffect(() => {
    setIsMobile(isMobileOrTablet());
  }, []);

  useEffect(() => {
    if (isEnabled && !hasRequestedLocation.current) {
      requestLocation();
      hasRequestedLocation.current = true;
      return;
    }

    if (!isEnabled) {
      hasRequestedLocation.current = false;
    }
  }, [isEnabled, requestLocation]);

  const openInApp = useCallback(() => {
    if (!checkinId) return;
    if (typeof window === "undefined") return;

    const checkinUrl = `untappd://checkin/${checkinId}`;
    window.open(checkinUrl, "_self");
  }, [checkinId]);

  const submitCheckin = useCallback(
    (totalScore: number) => {
      const currentBeer = session.currentBeer;
      if (!isEnabled || !user.untappd || !currentBeer) {
        return;
      }

      const geoLat = location.lat.toFixed(4);
      const geoLng = location.lng.toFixed(4);
      const gmtOffset = getGmtOffset().toString();

      const formDataUntappd = new FormData();
      formDataUntappd.append("bid", currentBeer.untappdBeerId.toString());
      formDataUntappd.append("geolat", geoLat);
      formDataUntappd.append("geolng", geoLng);
      formDataUntappd.append("foursquare_id", selectedVenue);
      formDataUntappd.append("shout", comment);
      formDataUntappd.append("timezone", "Europe/Copenhagen");
      formDataUntappd.append("gmt_offset", gmtOffset);

      if (includeScore) {
        formDataUntappd.append("rating", totalScore.toString());
      }

      untappdFetcher.submit(formDataUntappd, {
        method: "POST",
        encType: "multipart/form-data",
        action: "/api/untappd/check-in",
      });
    },
    [
      comment,
      includeScore,
      isEnabled,
      location.lat,
      location.lng,
      selectedVenue,
      session,
      untappdFetcher,
      user,
    ]
  );

  useEffect(() => {
    if (untappdFetcher.state !== "idle") return;

    const responseData = untappdFetcher.data as
      | { success: true; data: { checkinId: number } }
      | { message?: string }
      | undefined;

    if (!responseData) {
      return;
    }

    const fetcherWithReset = untappdFetcher as UntappdFetcher & {
      reset?: () => void;
    };

    if ("success" in responseData && responseData.success) {
      setCheckinId(responseData.data.checkinId);
      setIsEnabled(false);
      setComment("");

      fetcherWithReset.reset?.();

      if (openInUntappd) {
        openInApp();
      }

      return;
    }

    const errorMessage =
      "message" in responseData
        ? (responseData.message ?? "Untappd check-in fejlede")
        : "Untappd check-in fejlede";
    showDangerToast(errorMessage);
    fetcherWithReset.reset?.();
  }, [untappdFetcher, openInUntappd, openInApp]);

  return useMemo(
    () => ({
      isEnabled,
      setIsEnabled,
      includeScore,
      setIncludeScore,
      openInUntappd,
      setOpenInUntappd,
      selectedVenue,
      setSelectedVenue,
      comment,
      setComment,
      checkinId,
      submitCheckin,
      openInApp,
      location,
      isMobile,
    }),
    [
      comment,
      includeScore,
      isEnabled,
      isMobile,
      location,
      openInApp,
      openInUntappd,
      selectedVenue,
      checkinId,
      submitCheckin,
    ]
  );
}
