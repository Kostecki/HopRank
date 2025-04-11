import type { SelectVote } from "~/database/schema.server";

// Calculate average score for a single vote
const calculateAverageScore = (vote: SelectVote): number => {
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
const calculateTotalScore = (votes: SelectVote[]): number => {
  if (votes.length === 0) return 0;

  // Calculate the average score for each vote and then find the overall average
  const totalScore = votes.reduce(
    (total, vote) => total + calculateAverageScore(vote),
    0
  );
  const averageScore = totalScore / votes.length;

  return averageScore;
};

export default calculateTotalScore;
