import { describe, expect, it } from "vitest";

import {
	clearKickVote,
	computeTally,
	getActiveKickVote,
	kickVoteOutcome,
	kickVoteThreshold,
	recordKickVoteResponse,
	startKickVote,
} from "./kickVoteState.server";

describe("kickVoteThreshold", () => {
	it("is strictly more than half of eligible voters", () => {
		expect(kickVoteThreshold(1)).toBe(1);
		expect(kickVoteThreshold(2)).toBe(2);
		expect(kickVoteThreshold(3)).toBe(2);
		expect(kickVoteThreshold(4)).toBe(3);
		expect(kickVoteThreshold(5)).toBe(3);
	});
});

describe("startKickVote / getActiveKickVote / clearKickVote", () => {
	it("stores and retrieves a vote by sessionId, and clears it", () => {
		const sessionId = 101;
		const state = startKickVote({
			sessionId,
			initiatorUserId: 1,
			targetUserId: 2,
			eligibleVoterIds: [1, 3, 4],
		});

		expect(getActiveKickVote(sessionId)).toBe(state);

		clearKickVote(sessionId);
		expect(getActiveKickVote(sessionId)).toBeUndefined();
	});

	it("treats a vote older than the timeout as expired and clears it", () => {
		const sessionId = 102;
		const state = startKickVote({
			sessionId,
			initiatorUserId: 1,
			targetUserId: 2,
			eligibleVoterIds: [1, 3],
		});
		state.startedAt = Date.now() - 4 * 60 * 1000; // older than the 3min timeout

		expect(getActiveKickVote(sessionId)).toBeUndefined();
	});
});

describe("recordKickVoteResponse / computeTally", () => {
	it("tallies yes/no responses, and overwrites a prior response from the same voter", () => {
		const sessionId = 103;
		startKickVote({
			sessionId,
			initiatorUserId: 1,
			targetUserId: 2,
			eligibleVoterIds: [1, 3, 4, 5],
		});

		recordKickVoteResponse(sessionId, 1, true);
		recordKickVoteResponse(sessionId, 3, false);
		recordKickVoteResponse(sessionId, 4, true);

		const state = getActiveKickVote(sessionId);
		expect(state).toBeDefined();
		if (!state) return;

		let tally = computeTally(state);
		expect(tally).toMatchObject({
			yesCount: 2,
			noCount: 1,
			totalEligible: 4,
			threshold: 3,
		});

		// Voter 3 changes their mind.
		recordKickVoteResponse(sessionId, 3, true);
		tally = computeTally(state);
		expect(tally).toMatchObject({
			yesCount: 3,
			noCount: 0,
			totalEligible: 4,
			threshold: 3,
		});

		clearKickVote(sessionId);
	});
});

describe("kickVoteOutcome", () => {
	it("is pending until the outcome is mathematically decided", () => {
		const sessionId = 104;
		startKickVote({
			sessionId,
			initiatorUserId: 1,
			targetUserId: 2,
			eligibleVoterIds: [1, 3, 4, 5], // threshold = 3
		});
		const state = getActiveKickVote(sessionId);
		if (!state) throw new Error("expected state");

		recordKickVoteResponse(sessionId, 1, true);
		expect(kickVoteOutcome(computeTally(state))).toBe("pending");

		recordKickVoteResponse(sessionId, 3, true);
		recordKickVoteResponse(sessionId, 4, true);
		expect(kickVoteOutcome(computeTally(state))).toBe("passed");

		clearKickVote(sessionId);
	});

	it("resolves to failed as soon as yes can no longer mathematically reach threshold", () => {
		const sessionId = 105;
		startKickVote({
			sessionId,
			initiatorUserId: 1,
			targetUserId: 2,
			eligibleVoterIds: [1, 3, 4, 5], // threshold = 3, so 2 "no"s make it unreachable
		});
		const state = getActiveKickVote(sessionId);
		if (!state) throw new Error("expected state");

		recordKickVoteResponse(sessionId, 1, false);
		expect(kickVoteOutcome(computeTally(state))).toBe("pending");

		recordKickVoteResponse(sessionId, 3, false);
		expect(kickVoteOutcome(computeTally(state))).toBe("failed");

		clearKickVote(sessionId);
	});

	it("resolves to failed on a unanimous no with only 2 eligible voters", () => {
		const sessionId = 106;
		startKickVote({
			sessionId,
			initiatorUserId: 1,
			targetUserId: 2,
			eligibleVoterIds: [1, 3], // threshold = 2
		});
		const state = getActiveKickVote(sessionId);
		if (!state) throw new Error("expected state");

		recordKickVoteResponse(sessionId, 1, false);
		expect(kickVoteOutcome(computeTally(state))).toBe("failed");

		clearKickVote(sessionId);
	});
});
