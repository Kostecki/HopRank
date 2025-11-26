import type { RatedBeers } from "~/types/session";

export type RatedBeerGroup = {
  score: number;
  beers: RatedBeers[];
};

const SCORE_TOLERANCE = 0.000001;

export function groupRatedBeersByScore(
  ratedBeers: RatedBeers[]
): RatedBeerGroup[] {
  const groups: RatedBeerGroup[] = [];

  for (const beer of ratedBeers) {
    const lastGroup = groups[groups.length - 1];

    if (
      lastGroup &&
      Math.abs(lastGroup.score - beer.averageScore) <= SCORE_TOLERANCE
    ) {
      lastGroup.beers.push(beer);
      continue;
    }

    groups.push({ score: beer.averageScore, beers: [beer] });
  }

  return groups;
}
