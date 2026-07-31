// In-memory, single-process vote-kick state -- intentionally not persisted
// or shared across instances (same reasoning as the beerInfoCache in
// getSessionProgress.server.ts: this app is a single-process, self-hosted
// deployment, and a kick vote is short-lived by nature). A server restart
// mid-vote silently dropping it is an acceptable edge case.

const VOTE_TIMEOUT_MS = 3 * 60 * 1000;

export type KickVoteState = {
	voteId: string;
	sessionId: number;
	initiatorUserId: number;
	targetUserId: number;
	/** Active participants minus the target, frozen at vote start. */
	eligibleVoterIds: number[];
	responses: Map<number, boolean>;
	startedAt: number;
};

export type KickVoteTally = {
	voteId: string;
	targetUserId: number;
	initiatorUserId: number;
	yesCount: number;
	noCount: number;
	totalEligible: number;
	threshold: number;
};

const activeVotes = new Map<number, KickVoteState>();

const isStale = (state: KickVoteState) =>
	Date.now() - state.startedAt > VOTE_TIMEOUT_MS;

/** Returns the in-progress vote for a session, clearing it first if stale. */
export function getActiveKickVote(
	sessionId: number,
): KickVoteState | undefined {
	const state = activeVotes.get(sessionId);
	if (!state) return undefined;

	if (isStale(state)) {
		activeVotes.delete(sessionId);
		return undefined;
	}

	return state;
}

export function startKickVote({
	sessionId,
	initiatorUserId,
	targetUserId,
	eligibleVoterIds,
}: {
	sessionId: number;
	initiatorUserId: number;
	targetUserId: number;
	eligibleVoterIds: number[];
}): KickVoteState {
	const state: KickVoteState = {
		voteId: crypto.randomUUID(),
		sessionId,
		initiatorUserId,
		targetUserId,
		eligibleVoterIds,
		responses: new Map(),
		startedAt: Date.now(),
	};

	activeVotes.set(sessionId, state);
	return state;
}

/** Records or overwrites a voter's response. Caller must have already validated the vote/voter. */
export function recordKickVoteResponse(
	sessionId: number,
	voterId: number,
	vote: boolean,
) {
	const state = activeVotes.get(sessionId);
	if (!state) return undefined;

	state.responses.set(voterId, vote);
	return state;
}

export function clearKickVote(sessionId: number) {
	activeVotes.delete(sessionId);
}

/** Majority of eligible voters -- strictly more than half. */
export function kickVoteThreshold(eligibleVoterCount: number) {
	return Math.floor(eligibleVoterCount / 2) + 1;
}

export function computeTally(state: KickVoteState): KickVoteTally {
	const totalEligible = state.eligibleVoterIds.length;
	const threshold = kickVoteThreshold(totalEligible);

	let yesCount = 0;
	let noCount = 0;
	for (const vote of state.responses.values()) {
		if (vote) yesCount++;
		else noCount++;
	}

	return {
		voteId: state.voteId,
		targetUserId: state.targetUserId,
		initiatorUserId: state.initiatorUserId,
		yesCount,
		noCount,
		totalEligible,
		threshold,
	};
}

export type KickVoteOutcome = "passed" | "failed" | "pending";

/** Whether the vote has a decided outcome yet, without waiting for every voter to respond. */
export function kickVoteOutcome(tally: KickVoteTally): KickVoteOutcome {
	if (tally.yesCount >= tally.threshold) return "passed";
	// Once "no" makes it mathematically impossible for "yes" to reach threshold, it's decided.
	if (tally.noCount > tally.totalEligible - tally.threshold) return "failed";
	return "pending";
}
