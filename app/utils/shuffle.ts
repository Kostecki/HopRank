import type { SelectSessionBeer } from "~/database/schema.types";

/* Shout-out to my man GPT 4o 🤖  */

/**
 * Generates a deterministic pseudo-random number generator (PRNG)
 * based on a string seed.
 *
 * The same input seed will always generate the same sequence of numbers.
 */
const createSeededRandom = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }

  return function () {
    // Mulberry32 PRNG algorithm
    let t = (hash += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * Uses the provided seeded PRNG to shuffle the list of beers.
 * This is a standard Fisher-Yates shuffle algorithm.
 *
 * Note: It does NOT mutate the original array — it returns a new one.
 */
const shuffleBeers = (beers: SelectSessionBeer[], random: () => number) => {
  const arr = beers.map((b) => b); // shallow copy
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
};

/**
 * Scores a shuffled beer list.
 * Penalizes adjacent beers from the same brewery or same addedBy user.
 *
 * Rules:
 * - Adjacent same brewery → +3 penalty
 * - Adjacent same addedBy  → +2 penalty
 */
const scoreBeers = (beers: SelectSessionBeer[]) => {
  let score = 0;
  for (let i = 1; i < beers.length; i++) {
    if (beers[i].breweryName === beers[i - 1].breweryName) score += 3;
    if (beers[i].addedBy === beers[i - 1].addedBy) score += 2;
  }
  return score;
};

/**
 * Main smart shuffler.
 *
 * Shuffles the beers deterministically based on the given seed,
 * and attempts 750 variations to find the best-scoring layout
 * (fewest adjacent same-brewery or same-user beers).
 *
 * If a perfect arrangement (score === 0) is found early, it returns that immediately.
 */
const smartShuffle = (beers: SelectSessionBeer[], seed: string) => {
  let bestScore = Infinity;
  let bestList = beers;

  for (let i = 0; i < 750; i++) {
    // Make each trial unique but still deterministic by varying the seed slightly
    const trialSeed = `${seed}-${i}`;
    const random = createSeededRandom(trialSeed);

    // Try a new shuffle
    const shuffled = shuffleBeers(beers, random);

    // Score the new arrangement
    const score = scoreBeers(shuffled);

    // Keep the best-scoring one
    if (score < bestScore) {
      bestScore = score;
      bestList = shuffled;
      if (score === 0) break; // Stop early if perfect
    }
  }

  return bestList;
};

export default smartShuffle;
