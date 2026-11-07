import { describe, expect, it } from "vitest";

import { toClientUser } from "./user";

const base = {
	id: 1,
	email: "a@test.com",
	admin: false,
	name: "A",
	untappdId: 7,
	username: "a",
	avatarURL: null,
	createdAt: "2026-01-01",
	lastUpdatedAt: "2026-01-01",
};

describe("toClientUser", () => {
	it("drops the Untappd access token and keeps the rest", () => {
		const client = toClientUser({
			...base,
			untappd: {
				id: 7,
				username: "a",
				name: "A",
				avatar: "a.png",
				accessToken: "secret",
			},
		});

		expect(JSON.stringify(client)).not.toContain("secret");
		expect(client.untappd).toEqual({
			id: 7,
			username: "a",
			name: "A",
			avatar: "a.png",
		});
		expect(client.email).toBe("a@test.com");
	});

	it("leaves a user without Untappd as it is", () => {
		expect(toClientUser(base)).toEqual(base);
	});
});
