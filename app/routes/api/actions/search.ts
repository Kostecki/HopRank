import invariant from "tiny-invariant";

const algoliaApplicationId = process.env.ALGOLIA_APP_ID;
const algoliaApiKey = process.env.ALGOLIA_API_KEY;
invariant(algoliaApplicationId, "Algolia Application Id is required");
invariant(algoliaApiKey, "Algolia Api Key is required");

export async function findBeers(searchString: string) {
  if (!searchString) {
    return [];
  }

  const url = `https://${algoliaApplicationId}-dsn.algolia.net/1/indexes/beer/query?x-algolia-application-id=${algoliaApplicationId}&x-algolia-api-key=${algoliaApiKey}`;
  const body = {
    params: `query=${searchString}`,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch beers");
  }

  const data = await response.json();
  const beers = data.hits.map((beer: any) => ({
    id: beer.bid.toString(),
    name: beer.beer_name,
    style: beer.type_name,
    brewery: beer.brewery_name,
  }));

  return beers;
}
