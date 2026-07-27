import type {
	SelectBeers,
	SelectCriteria,
	SelectSessionState,
	SelectSessions,
	SelectUsers,
} from "~/database/schema.types";

// Base row type aliases (from Drizzle) for clarity.
type BaseBeer = SelectBeers;
type BaseSession = SelectSessions;
type BaseSessionState = SelectSessionState;
type BaseCriterion = SelectCriteria;

// User shape used in session progress (renamed/filtered from raw user row).
// Deliberately excludes email/admin: this rides in SessionProgress.users,
// which is returned to unauthenticated viewers on the public read-only
// results route (and is not the same "public" shape as UserPublic, which
// is only ever used for the logged-in user's own session data).
export type SessionProgressUser = Pick<
	SelectUsers,
	"id" | "name" | "username" | "avatarURL" | "untappdId"
>;

// Aggregated criterion score used when showing overall scoring breakdowns.
export type ScoredCriterion = {
	criterionId: BaseCriterion["id"];
	name: BaseCriterion["name"];
	weight: BaseCriterion["weight"];
	averageScore: number;
};

// Rated beer view-model (id renamed to beerId, plus computed fields)
export type RatedBeers = {
	beerId: BaseBeer["id"];
	untappdBeerId: BaseBeer["untappdBeerId"];
	name: BaseBeer["name"];
	breweryName: BaseBeer["breweryName"];
	style: BaseBeer["style"];
	label: BaseBeer["label"];
	label_hd: BaseBeer["label_hd"];
	addedByUserId: number | null;
	order: number | null;
	averageScore: number;
	criteriaBreakdown: ScoredCriterion[];
	votesCount: number;
};

export type CurrentBeer = RatedBeers & {
	currentVoteCount: number;
	totalPossibleVoteCount: number;
	userRatings: Record<number, number>;
	userHadBeer?: boolean;
};

// Aggregated session state view-model combining session + state + computed counts.
export type SessionProgress = {
	sessionId: BaseSession["id"];
	sessionName: BaseSession["name"];
	status: BaseSessionState["status"] | null | undefined;
	createdAt: BaseSession["createdAt"];
	createdBy: BaseSession["createdBy"];
	joinCode: BaseSession["joinCode"];
	beersTotalCount: number;
	users: SessionProgressUser[];
	scoredCriteria: ScoredCriterion[];
	currentBeer: CurrentBeer | null;
	ratedBeers: RatedBeers[];
	progressPercentage?: number;
};

// Raw criterion (no aggregated score) used in forms/UI; derive directly from table.
export type Criterion = Pick<
	BaseCriterion,
	"id" | "name" | "description" | "weight"
>;

export const SessionStatus = {
	created: "created",
	active: "active",
	finished: "finished",
} as const;

export const SessionBeerStatus = {
	waiting: "waiting",
	rating: "rating",
	rated: "rated",
} as const;

type Rater = { userId: number; name: string | null; avgScore: number };
export type SessionStats = {
	averageABV: number;
	averageRating: number;
	styleStats: {
		uniqueCount: number;
		mostPopular: { style: string; count: number } | null;
	};
	highestRaters: Rater[];
	lowestRaters: Rater[];
};
