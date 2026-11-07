type Rating = { criterionId: number; score: number };
type Criterion = { id: number; name: string; weight: number };

export type CriterionScore = {
	criterionId: number;
	name: string;
	weight: number;
	averageScore: number;
};

/** The average score per criterion. A criterion nobody rated scores 0. */
export const averageByCriterion = (
	ratings: Rating[],
	criteria: Criterion[],
): CriterionScore[] =>
	criteria.map((criterion) => {
		const scores = ratings.filter((r) => r.criterionId === criterion.id);
		const averageScore =
			scores.reduce((sum, r) => sum + r.score, 0) / (scores.length || 1);

		return {
			criterionId: criterion.id,
			name: criterion.name,
			weight: criterion.weight,
			averageScore,
		};
	});

/**
 * A beer's score from its ratings: the average per criterion, and their
 * average weighted by each criterion's weight.
 */
export const scoreBeer = (beerRatings: Rating[], criteria: Criterion[]) => {
	const criteriaBreakdown = averageByCriterion(beerRatings, criteria);

	const totalWeight = criteriaBreakdown.reduce((sum, c) => sum + c.weight, 0);
	const totalWeighted = criteriaBreakdown.reduce(
		(sum, c) => sum + c.averageScore * c.weight,
		0,
	);

	return {
		criteriaBreakdown,
		averageScore: totalWeight > 0 ? totalWeighted / totalWeight : 0,
	};
};
