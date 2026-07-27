import { describe, expect, it, vi } from "vitest";

// scoreBeerOrder/shuffle are pure, but shuffle.ts also imports the real db
// singleton at module scope (which has disk I/O side effects on import) —
// stub it out so this stays a pure, fast unit test.
vi.mock("~/database/config.server", () => ({ db: {} }));

const { scoreBeerOrder, shuffle } = await import("./shuffle");

describe("scoreBeerOrder", () => {
  const beer = (
    id: number,
    breweryName: string,
    style: string,
    addedByUserId: number
  ) => ({ id, beerId: id, addedByUserId, breweryName, style, order: null });

  it("scores 0 for a single beer (no adjacent pairs)", () => {
    expect(scoreBeerOrder([beer(1, "A", "IPA", 1)])).toBe(0);
  });

  it("awards a point per differing attribute between adjacent beers", () => {
    const list = [beer(1, "A", "IPA", 1), beer(2, "B", "Stout", 2)];
    // brewery differs, style differs, addedBy differs => 3
    expect(scoreBeerOrder(list)).toBe(3);
  });

  it("awards 0 extra points when all attributes match the previous beer", () => {
    const list = [beer(1, "A", "IPA", 1), beer(2, "A", "IPA", 1)];
    expect(scoreBeerOrder(list)).toBe(0);
  });

  it("sums scores across more than two beers", () => {
    const list = [
      beer(1, "A", "IPA", 1),
      beer(2, "B", "IPA", 1), // brewery differs => +1
      beer(3, "B", "Stout", 2), // style + addedBy differ => +2
    ];
    expect(scoreBeerOrder(list)).toBe(3);
  });
});

describe("shuffle", () => {
  it("returns an array with the same elements, possibly reordered", () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input);

    expect(result).toHaveLength(input.length);
    expect([...result].sort()).toEqual([...input].sort());
  });

  it("does not mutate the input array", () => {
    const input = [1, 2, 3, 4, 5];
    const copy = [...input];
    shuffle(input);

    expect(input).toEqual(copy);
  });
});
