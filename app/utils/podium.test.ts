import { describe, expect, it } from "vitest";

import type { RatedBeers } from "~/types/session";

import { groupRatedBeersByScore } from "./podium";

const beer = (beerId: number, averageScore: number): RatedBeers => ({
  beerId,
  untappdBeerId: beerId,
  name: `Beer ${beerId}`,
  breweryName: "Brewery",
  style: "IPA",
  label: "label.png",
  label_hd: null,
  addedByUserId: 1,
  order: null,
  averageScore,
  criteriaBreakdown: [],
  votesCount: 1,
});

describe("groupRatedBeersByScore", () => {
  it("returns one group per beer when all scores differ", () => {
    const groups = groupRatedBeersByScore([beer(1, 4.5), beer(2, 3.2)]);

    expect(groups).toHaveLength(2);
    expect(groups[0].beers).toHaveLength(1);
    expect(groups[1].beers).toHaveLength(1);
  });

  it("groups adjacent beers with the same score into a tie", () => {
    const groups = groupRatedBeersByScore([
      beer(1, 4.5),
      beer(2, 4.5),
      beer(3, 3.0),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].score).toBe(4.5);
    expect(groups[0].beers.map((b) => b.beerId)).toEqual([1, 2]);
    expect(groups[1].beers.map((b) => b.beerId)).toEqual([3]);
  });

  it("treats scores within the tolerance as a tie", () => {
    const groups = groupRatedBeersByScore([
      beer(1, 4.5),
      beer(2, 4.5 + 0.0000001),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].beers).toHaveLength(2);
  });

  it("does not group beers with the same score if they aren't adjacent", () => {
    const groups = groupRatedBeersByScore([
      beer(1, 4.5),
      beer(2, 3.0),
      beer(3, 4.5),
    ]);

    expect(groups).toHaveLength(3);
  });

  it("returns an empty array for no beers", () => {
    expect(groupRatedBeersByScore([])).toEqual([]);
  });
});
