import type { SelectVote } from "~/database/schema.server";

// Calculate average score for a single vote
const calculateAverageScore = (vote: SelectVote) => {
  const { vote: ratings } = vote;

  // Handle case with no ratings or weights
  if (!ratings || ratings.length === 0) return 0;

  const totalWeight = ratings.reduce((sum, rating) => sum + rating.weight, 0);

  if (totalWeight === 0) return 0; // Avoid division by zero if no weights are provided

  const weightedSum = ratings.reduce(
    (sum, rating) => sum + rating.rating * rating.weight,
    0
  );

  // Calculate and return the weighted average
  return weightedSum / totalWeight;
};

// Calculate the total score (average of all votes) for a beer
const calculateTotalScore = (votes: SelectVote[]) => {
  if (votes.length === 0) return 0;

  // Calculate the average score for each vote and then find the overall average
  const totalScore = votes.reduce(
    (total, vote) => total + calculateAverageScore(vote),
    0
  );
  const averageScore = totalScore / votes.length;

  return averageScore;
};

const calculateSingleTotalScore = (votes: SelectVote[]) => {
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

export { calculateTotalScore, calculateSingleTotalScore };
