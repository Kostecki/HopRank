import invariant from "tiny-invariant";

import type { AlgoliaBeerResponse } from "~/types/untappd";
import type { Route } from "./+types/search";

const algoliaApplicationId = import.meta.env.VITE_ALGOLIA_APP_ID;
const algoliaApiKey = import.meta.env.VITE_ALGOLIA_API_KEY;
invariant(algoliaApplicationId, "Algolia Application Id is required");
invariant(algoliaApiKey, "Algolia Api Key is required");

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const searchString = url.searchParams.get("q") || "";

  if (!searchString) return [];

  const requestUrl = `https://${algoliaApplicationId}-dsn.algolia.net/1/indexes/beer/query?x-algolia-application-id=${algoliaApplicationId}&x-algolia-api-key=${algoliaApiKey}`;

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
    style: beer.type_name,
    breweryName: beer.brewery_name,
    label: beer.beer_label,
  }));

  return beers;
}
