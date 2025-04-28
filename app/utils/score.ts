import type { SelectVote } from "~/database/schema.types";

/**
 * Helper for calculateTotalScore - calculate average score for one vote
 */
const calculateAverageScore = (vote: SelectVote): number => {
  const { vote: ratings } = vote;

  if (!ratings || ratings.length === 0) return 0;

  const { weightedSum, totalWeight } = ratings.reduce(
    (acc, rating) => {
      acc.weightedSum += rating.rating * (rating.weight ?? 1);
      acc.totalWeight += rating.weight ?? 1;
      return acc;
    },
    { weightedSum: 0, totalWeight: 0 }
  );

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
};

/**
 * Calculate the overall average score across multiple users' votes
 * (used to show final average score for a beer)
 */
export const calculateTotalScore = (votes: SelectVote[]): number => {
  if (votes.length === 0) return 0;

  const totalScore = votes.reduce(
    (total, vote) => total + calculateAverageScore(vote),
    0
  );

  return totalScore / votes.length;
};

/**
 * Calculate the total average score for each rating field individually
 * (used to show average scores for each rating field)
 */
export const calculateSingleTotalScore = (votes: SelectVote[]) => {
  const grouped: Record<string, { total: number; count: number }> = {};

  votes.forEach((entry) => {
    entry.vote.forEach(({ name, rating }) => {
      if (!grouped[name]) {
        grouped[name] = { total: 0, count: 0 };
      }
      grouped[name].total += rating;
      grouped[name].count += 1;
    });
  });

  return Object.entries(grouped).map(([name, { total, count }]) => ({
    name,
    score: total / count,
  }));
};

/**
 * Calculate the total weighted score for a single set of form values
 * (used for live previewing the user's own score before submitting)
 */
export const calculateVoteScore = (
  values: Record<string, number>,
  ratings: { name: string; weight: number }[]
): number => {
  const { weightedSum, totalWeight } = Object.entries(values).reduce(
    (acc, [name, rating]) => {
      const weight = ratings.find((r) => r.name === name)?.weight ?? 1;
      acc.weightedSum += rating * weight;
      acc.totalWeight += weight;
      return acc;
    },
    { weightedSum: 0, totalWeight: 0 }
  );

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
};
