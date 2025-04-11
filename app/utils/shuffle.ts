import type { SelectSessionBeer } from "~/database/schema.types";

// Simple shuffle function (Fisher-Yates algorithm)
const shuffleArray = (array: SelectSessionBeer[]): SelectSessionBeer[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/*
  This function takes an array of beers and shuffles them in a way that ensures 
  that beers from the same brewery are not adjacent to each other.
  
  It also tries to minimize beers from the same owner being adjacent, but this
  rule can be relaxed when necessary, especially when there are many beers
  from the same owner.
*/
const smartShuffle = (beers: SelectSessionBeer[]): SelectSessionBeer[] => {
  // Shuffle all beers first
  const shuffledBeers = shuffleArray(beers);

  const result: SelectSessionBeer[] = [];

  // This will keep track of the last brewery and owner we've added
  let lastBrewery: string | null = null;
  let lastOwner: number | null = null;

  // Distribute the shuffled beers into the result array
  shuffledBeers.forEach((beer) => {
    // Try to avoid placing beers from the same brewery or owner next to each other
    if (
      (lastBrewery && lastBrewery === beer.breweryName) ||
      (lastOwner && lastOwner === beer.addedBy)
    ) {
      // If we find a beer that violates the adjacency rule, push it later
      result.unshift(beer); // Put it back at the start of the array for re-shuffling
    } else {
      result.push(beer); // Otherwise, add it to the result array
      lastBrewery = beer.breweryName;
      lastOwner = beer.addedBy;
    }
  });

  // After trying to shuffle directly, we might need to shuffle again if adjacency rules are violated
  // Retry shuffling if we added beers that were out of order
  if (result.length !== shuffledBeers.length) {
    return smartShuffle(result); // Recurse if the result array is incomplete
  }

  return result;
};

export default smartShuffle;
