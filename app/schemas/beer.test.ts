import { describe, expect, it } from "vitest";

import { beerInputSchema } from "./beer";

const beer = {
	untappdBeerId: "123",
	name: "Beer Geek Breakfast",
	breweryName: "Mikkeller",
	abv: 7.5,
	style: "Stout - Oatmeal",
	label: "label.png",
};

describe("beerInputSchema", () => {
	it("accepts a search result and turns the string id into a number", () => {
		expect(beerInputSchema.parse(beer).untappdBeerId).toBe(123);
	});

	it("accepts a 0% beer", () => {
		expect(beerInputSchema.parse({ ...beer, abv: 0 }).abv).toBe(0);
	});

	it.each([
		["a missing ABV", { abv: undefined }],
		["a NaN ABV", { abv: Number.NaN }],
		["a text ABV", { abv: "7.5" }],
		["a negative ABV", { abv: -1 }],
		["an empty name", { name: " " }],
		["a missing label", { label: undefined }],
		["a non-numeric id", { untappdBeerId: "abc" }],
		["a zero id", { untappdBeerId: 0 }],
	])("rejects %s", (_, override) => {
		expect(beerInputSchema.safeParse({ ...beer, ...override }).success).toBe(
			false,
		);
	});
});
