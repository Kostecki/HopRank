export type ScoreGroup<T> = {
	score: number;
	entries: T[];
};

const SCORE_TOLERANCE = 0.000001;

/** Groups entries with the same score. Input must already be in rank order. */
export function groupByAverageScore<T extends { averageScore: number }>(
	items: T[],
): ScoreGroup<T>[] {
	const groups: ScoreGroup<T>[] = [];

	for (const item of items) {
		const lastGroup = groups[groups.length - 1];

		if (
			lastGroup &&
			Math.abs(lastGroup.score - item.averageScore) <= SCORE_TOLERANCE
		) {
			lastGroup.entries.push(item);
			continue;
		}

		groups.push({ score: item.averageScore, entries: [item] });
	}

	return groups;
}
