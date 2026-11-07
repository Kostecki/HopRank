import { describe, expect, it } from "vitest";

import {
	extractSessionId,
	isSafeRedirect,
	isValidVoteScore,
	resolveSocketUrl,
	sliderConf,
	sortByDisplayName,
} from "./utils";

describe("isValidVoteScore", () => {
	const { stepSize, max } = sliderConf();
	const stepsCount = Math.round(max / stepSize);
	const validSteps = Array.from(
		{ length: stepsCount },
		(_, i) => (i + 1) * stepSize,
	);

	it.each(validSteps)("accepts valid step value %f", (score) => {
		expect(isValidVoteScore(score)).toBe(true);
	});

	it.each([0, -1, -0.25, 5.25, 100, 0.3, 1.1, NaN, Infinity, -Infinity])(
		"rejects invalid value %s",
		(score) => {
			expect(isValidVoteScore(score)).toBe(false);
		},
	);

	it.each(["3", null, undefined, {}, [], true])(
		"rejects non-number input %s",
		(score) => {
			expect(isValidVoteScore(score)).toBe(false);
		},
	);
});

describe("isSafeRedirect", () => {
	it.each(["/sessions", "/sessions/123", "/"])(
		"accepts a same-origin path %s",
		(target) => {
			expect(isSafeRedirect(target)).toBe(true);
		},
	);

	it.each([
		null,
		undefined,
		"",
		"//evil.com",
		"https://evil.com",
		"evil.com",
		"javascript:alert(1)",
	])("rejects unsafe target %s", (target) => {
		expect(isSafeRedirect(target)).toBe(false);
	});
});

describe("sortByDisplayName", () => {
	const user = (name: string | null, username: string | null = null) => ({
		name,
		username,
	});
	const names = (users: ReturnType<typeof user>[]) =>
		sortByDisplayName(users).map((u) => u.name ?? u.username);

	it("sorts alphabetically, ignoring case", () => {
		expect(names([user("bo"), user("Cy"), user("Ann")])).toEqual([
			"Ann",
			"bo",
			"Cy",
		]);
	});

	it("puts Æ, Ø and Å after Z", () => {
		expect(
			names([user("Åse"), user("Ømer"), user("Zoe"), user("Ægir")]),
		).toEqual(["Zoe", "Ægir", "Ømer", "Åse"]);
	});

	it("uses the username when there's no name", () => {
		expect(names([user("Cy"), user(null, "bo")])).toEqual(["bo", "Cy"]);
	});
});

describe("resolveSocketUrl", () => {
	it("uses the page's host for a localhost address, keeping the port", () => {
		expect(resolveSocketUrl("http://localhost:4000", "192.168.1.20")).toBe(
			"http://192.168.1.20:4000/",
		);
		expect(resolveSocketUrl("http://127.0.0.1:4000", "192.168.1.20")).toBe(
			"http://192.168.1.20:4000/",
		);
	});

	it("still works when the page is on localhost too", () => {
		expect(resolveSocketUrl("http://localhost:4000", "localhost")).toBe(
			"http://localhost:4000/",
		);
	});

	it("leaves a real address alone", () => {
		expect(resolveSocketUrl("wss://example.com", "example.com")).toBe(
			"wss://example.com",
		);
	});
});

describe("extractSessionId", () => {
	it("parses a positive integer", () => {
		expect(extractSessionId("42")).toBe(42);
	});

	it.each([
		undefined,
		"",
		"0",
		"-1",
		"1.5",
		"0x10",
		"1e3",
		"Infinity",
		"abc",
		"99999999999999999999",
	])("rejects %s with a 400", (input) => {
		try {
			extractSessionId(input);
			expect.fail("expected a 400 to be thrown");
		} catch (error) {
			expect((error as { init?: { status?: number } }).init?.status).toBe(400);
		}
	});
});
