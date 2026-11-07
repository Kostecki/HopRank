import { describe, expect, it } from "vitest";

import { checkinSchema } from "./checkin";
import { idSchema } from "./common";
import { barSelectionSchema } from "./oneBeer";
import { userNameSchema } from "./user";
import { kickVoteSchema, voteSchema } from "./vote";

describe("idSchema", () => {
	it("accepts a positive integer, also as a form string", () => {
		expect(idSchema.parse("7")).toBe(7);
	});

	it.each(["0", "-1", "1.5", "abc", undefined])("rejects %s", (value) => {
		expect(idSchema.safeParse(value).success).toBe(false);
	});
});

describe("barSelectionSchema", () => {
	it("treats an empty Foursquare id as a typed bar", () => {
		expect(
			barSelectionSchema.parse({ name: "Ølbaren", foursquareId: "" })
				.foursquareId,
		).toBeNull();
	});

	it("rejects a bar without a name", () => {
		expect(barSelectionSchema.safeParse({ foursquareId: "x" }).success).toBe(
			false,
		);
	});
});

describe("voteSchema", () => {
	const vote = {
		sessionId: 1,
		userId: 2,
		beerId: 3,
		ratings: [{ criterionId: 4, score: 3.5 }],
	};

	it("accepts a valid vote", () => {
		expect(voteSchema.parse(vote)).toEqual(vote);
	});

	it.each([
		["no vote", null, "Invalid vote data"],
		["no ratings", { ...vote, ratings: [] }, "Invalid vote data"],
		[
			"a score off the slider's steps",
			{ ...vote, ratings: [{ criterionId: 4, score: 3.3 }] },
			"Invalid score in vote",
		],
	])("rejects %s", (_, value, message) => {
		const result = voteSchema.safeParse(value);
		expect(result.success).toBe(false);
		expect(result.error?.issues[0]?.message).toBe(message);
	});
});

describe("kickVoteSchema", () => {
	it("reads the vote as a boolean", () => {
		expect(kickVoteSchema.parse({ voteId: "v1", vote: "false" }).vote).toBe(
			false,
		);
	});

	it("rejects anything but true or false", () => {
		expect(
			kickVoteSchema.safeParse({ voteId: "v1", vote: "yes" }).success,
		).toBe(false);
	});
});

describe("userNameSchema", () => {
	it("trims the name", () => {
		expect(userNameSchema.parse("  Jacob ")).toBe("Jacob");
	});

	it.each(["", "   ", "x".repeat(51)])("rejects %j", (name) => {
		expect(userNameSchema.safeParse(name).success).toBe(false);
	});
});

describe("checkinSchema", () => {
	const form = {
		bid: "123",
		geolat: "55.6761",
		geolng: "12.5683",
		foursquare_id: "abc",
		shout: "Skål",
		timezone: "Europe/Copenhagen",
		gmt_offset: "1",
	};

	it("turns the form into Untappd's fields, without a rating when none is given", () => {
		expect(checkinSchema.parse(form)).toEqual({
			...form,
			rating: "",
		});
	});

	it("keeps a rating", () => {
		expect(checkinSchema.parse({ ...form, rating: "4.25" }).rating).toBe(
			"4.25",
		);
	});

	it.each([
		["a missing beer", { bid: undefined }],
		["a latitude out of range", { geolat: "91" }],
		["a rating above 5", { rating: "6" }],
		["a comment over 140 characters", { shout: "x".repeat(141) }],
	])("rejects %s", (_, override) => {
		expect(checkinSchema.safeParse({ ...form, ...override }).success).toBe(
			false,
		);
	});
});
