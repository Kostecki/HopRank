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
      `https://api.untappd.com/v4/beer/info/${beerId}?access_token=${accessToken}&compact=true`
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
