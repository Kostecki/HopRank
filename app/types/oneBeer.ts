import type { SelectBeers } from "~/database/schema.types";

export type VenueDetails = {
	address: string | null;
	city: string | null;
	category: string | null;
	lat: number | null;
	lng: number | null;
};

export type SessionBar = VenueDetails & {
	id: number;
	name: string;
	// Null for a bar typed by hand rather than found through venue search.
	foursquareId: string | null;
	addedByUserId: number;
	status: string;
	placementCount: number;
	// The bar's place in the crawl, counting from 1.
	stopNumber: number;
};

export type RankedBar = SessionBar & {
	averagePosition: number;
	placedByCount: number;
	firstPlaceCount: number;
	bestPosition: number;
	worstPosition: number;
};

export type CurrentBar = SessionBar & {
	placedCount: number;
	expectedCount: number;
};

export type SessionBarList = {
	bars: SessionBar[];
	hasPlacedCurrent: boolean;
};

export type BarSelection = Partial<VenueDetails> & {
	name: string;
	foursquareId: string | null;
};

export type PersonalPlacements = {
	userId: number;
	// Keyed by bar id. A bar the person didn't place is missing.
	positions: Record<number, number>;
};

export type OneBeerRanking = {
	beer: SelectBeers | null;
	rankedBars: RankedBar[];
	currentBar: CurrentBar | null;
	queuedBars: SessionBar[];
	personalPlacements: PersonalPlacements[];
};
