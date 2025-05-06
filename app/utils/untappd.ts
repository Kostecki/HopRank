/**
 * Generates a URL to the Untappd beer page using the given Untappd beer ID.
 *
 * @param untappdBeerId - The ID of the beer on Untappd (as a number or string).
 * @returns The full URL to the beer's page on Untappd.
 */
export const createBeerLink = (untappdBeerId: number | string): string => {
  return `https://untappd.com/beer/${untappdBeerId}`;
};

export const createProfileLink = (username: string) => {
  return `https://untappd.com/user/${username}`;
};

export const getBeerInfo = async (beerId: number, accessToken: string) => {
  const response = await fetch(
    `https://api.untappd.com/v4/beer/info/${beerId}?access_token=${accessToken}&compact=true`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch beer info");
  }

  const data = await response.json();

  return data.response.beer;
};
