import type { Checkin, VenuesResponse } from "~/types/untappd";

const API_URL = "https://api.untappd.com/v4";
const UAH_VENUE_ID = "5e7b4d99c91df60008e8b168";
const UAH_LABEL = "🏡 Untappd at Home";

/**
 * Generates a URL to the Untappd beer page using the given Untappd beer ID.
 *
 * @param untappdBeerId - The ID of the beer on Untappd (as a number or string).
 * @returns The full URL to the beer's page on Untappd.
 */
export const createBeerLink = (untappdBeerId: number | string): string => {
  return `https://untappd.com/beer/${untappdBeerId}`;
};

/**
 *
 * @param username - The Untappd username of the user.
 * @returns The full URL to the user's profile on Untappd.
 */
export const createProfileLink = (username: string) => {
  return `https://untappd.com/user/${username}`;
};

/**
 * Fetches detailed information about a beer from the Untappd API.
 *
 * @param beerId - The ID of the beer to fetch information for.
 * @param accessToken - The access token for authenticating with the Untappd API.
 * @returns The beer information if successful, or null if there was an error.
 */
export const getBeerInfo = async (beerId: number, accessToken: string) => {
  try {
    const response = await fetch(
      `${API_URL}/beer/info/${beerId}?access_token=${accessToken}&compact=true`
    );

    if (!response.ok) {
      console.error("Untappd API error:", response.status, response.statusText);
      return null;
    }

    const jsonData = await response.json();

    // Ensure structure is valid
    if (!jsonData?.response?.beer) {
      console.warn("Unexpected response format:", jsonData);
      return null;
    }

    return jsonData.response.beer;
  } catch (err) {
    console.error("Failed to fetch beer info:", err);
    return null;
  }
};

export const checkinBeer = async (
  checkin: Checkin,
  clientId: string,
  accessToken: string
) => {
  try {
    const body = new URLSearchParams(checkin as Record<string, string>);

    const response = await fetch(
      `${API_URL}/checkin/add?access_token=${accessToken}`,
      {
        method: "POST",
        headers: {
          Accept: "application/json; charset=utf-8",
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept-Language": "en",
          "User-Agent": `HopRank (${clientId})`,
        },
        body: body.toString(),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Untappd API error:", response.status, response.statusText);
      console.error("Error details:", data);
      return { success: false, error: "Failed to check in beer" };
    }

    const checkinId = data.response.checkin_id;

    return {
      success: true,
      data: {
        checkinId,
      },
    };
  } catch (error) {
    console.error("Error checking in beer:", error);
    return { success: false, error: "Failed to check in beer" };
  }
};

export const getVenues = async (
  accessToken: string,
  lat: number,
  lng: number,
  query?: string
): Promise<VenuesResponse> => {
  try {
    const request_url = new URL(`${API_URL}/venue/around`);
    request_url.searchParams.append("access_token", accessToken);
    request_url.searchParams.append("lat", lat.toString());
    request_url.searchParams.append("lng", lng.toString());
    if (query) request_url.searchParams.append("q", query);

    const response = await fetch(request_url.toString());

    if (response.status === 429) {
      console.error("Rate limit exceeded. Please try again later.");
      return [
        { label: "Seneste", items: [] },
        { label: "I nærheden", items: [] },
      ];
    }

    if (!response.ok) {
      console.error("Untappd API error:", response.status, response.statusText);
      return [
        { label: "Seneste", items: [] },
        { label: "I nærheden", items: [] },
      ];
    }

    const jsonData = await response.json();

    const recent = jsonData.response.recent.items.map(
      (venue: {
        foursquare: { foursquare_id: string };
        venue_name: string;
      }) => ({
        value: String(venue.foursquare.foursquare_id),
        label: venue.venue_name,
      })
    );

    const foursquare = jsonData.response.foursquare.items.map(
      (venue: {
        venue_name: string;
        foursquare: { foursquare_id: string };
      }) => ({
        value: String(venue.foursquare.foursquare_id),
        label: venue.venue_name,
      })
    );

    const grouped: VenuesResponse = [
      { label: "Seneste", items: recent },
      { label: "I nærheden", items: foursquare },
    ];

    // Always include Untappd at Home in recent
    if (!grouped[0].items.some((v) => v.value === UAH_VENUE_ID)) {
      grouped[0].items.unshift({
        value: UAH_VENUE_ID,
        label: UAH_LABEL,
      });
    }

    return grouped;
  } catch (error) {
    console.error("Error fetching venues:", error);
    return [
      { label: "Seneste", items: [] },
      { label: "I nærheden", items: [] },
    ];
  }
};
