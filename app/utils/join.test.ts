import { describe, expect, it } from "vitest";

import { isValidJoinCode, normalizeJoinCode } from "./join";

describe("normalizeJoinCode", () => {
	it("trims whitespace and uppercases", () => {
		expect(normalizeJoinCode(" ab12c ")).toBe("AB12C");
	});

	it("returns an empty string for null/undefined", () => {
		expect(normalizeJoinCode(null)).toBe("");
		expect(normalizeJoinCode(undefined)).toBe("");
	});
});

describe("isValidJoinCode", () => {
	it.each([
		"ABC12",
		"00000",
		"ZZZZZ",
		" abc12 ",
	])("accepts a valid 5-character alphanumeric code %s", (code) => {
		expect(isValidJoinCode(code)).toBe(true);
	});

	it.each([
		"ABC1",
		"ABC123",
		"",
		"AB-12",
		null,
		undefined,
	])("rejects an invalid code %s", (code) => {
		expect(isValidJoinCode(code)).toBe(false);
	});
});
