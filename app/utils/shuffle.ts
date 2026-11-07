export type BeerRow = {
	id: number;
	beerId: number;
	addedByUserId: number | null;
	breweryName: string;
	style: string;
	order: number | null;
};

/**
 * Scores the given beer list based on how well it avoids repeating brewery, style, and user in adjacent items.
 * Higher scores indicate more variety between neighboring beers.
 *
 * @param list - The list of beers to score.
 * @returns The calculated score as a number.
 */
export const scoreBeerOrder = (list: BeerRow[]) => {
	let score = 0;
	for (let i = 1; i < list.length; i++) {
		const prev = list[i - 1];
		const curr = list[i];
		if (curr.breweryName !== prev.breweryName) score++;
		if (curr.style !== prev.style) score++;
		if (curr.addedByUserId !== prev.addedByUserId) score++;
	}

	return score;
};

/**
 * Performs an in-place Fisher–Yates shuffle and returns a new array with randomized order.
 *
 * @param array - The array to shuffle.
 * @returns A new shuffled array.
 */
export const shuffle = <T>(array: T[]) => {
	const arr = [...array];
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}

	return arr;
};
