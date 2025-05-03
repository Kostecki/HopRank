/**
 * Generates a URL to the Untappd beer page using the given Untappd beer ID.
 *
 * @param untappdBeerId - The ID of the beer on Untappd (as a number or string).
 * @returns The full URL to the beer's page on Untappd.
 */
export const createLink = (untappdBeerId: number | string): string => {
  return `https://untappd.com/beer/${untappdBeerId}`;
};
