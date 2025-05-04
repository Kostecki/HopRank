/**
 * Calculates the total weighted average score based on user input and criterion weights.
 * Useful for previewing the user's score before submission.
 *
 * @param values - A record of criterion names mapped to their input scores.
 * @param ratings - An array of criteria with names and their associated weights.
 * @returns The weighted average score as a number.
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
