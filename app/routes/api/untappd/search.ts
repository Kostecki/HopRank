import type { AlgoliaBeerResponse } from "~/types/untappd";
import type { Route } from "./+types/search";

import { invariant } from "~/utils/invariant";

const ALGOLIA_APP_ID = import.meta.env.VITE_ALGOLIA_APP_ID;
const ALGOLIA_API_K = import.meta.env.VITE_ALGOLIA_API_K;
invariant(ALGOLIA_APP_ID, "VITE_ALGOLIA_APP_ID must be set in .env");
invariant(ALGOLIA_API_K, "VITE_ALGOLIA_API_K must be set in .env");

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const searchString = url.searchParams.get("q") || "";

  if (!searchString) return [];

  const requestUrl = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/beer/query?x-algolia-application-id=${ALGOLIA_APP_ID}&x-algolia-api-key=${ALGOLIA_API_K}`;

  const response = await fetch(requestUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      params: `query=${searchString}`,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch beers");
  }

  const jsonData = (await response.json()) as AlgoliaBeerResponse;
  const beers = jsonData.hits.map((beer) => ({
    untappdBeerId: beer.bid.toString(),
    name: beer.beer_name,
    breweryName: beer.brewery_name,
    abv: beer.beer_abv,
    style: beer.type_name,
    label: beer.beer_label_hd ?? beer.beer_label,
  }));

  return beers;
}
