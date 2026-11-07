import { beforeEach, describe, expect, it, vi } from "vitest";

const getVenues = vi.fn(async () => [
	{ label: "Seneste", items: [] },
	{ label: "I nærheden", items: [] },
]);
vi.mock("~/utils/untappd", () => ({ getVenues }));

type User = { id: number; admin: boolean; untappd?: { accessToken: string } };
let currentUser: User | null = null;
vi.mock("~/auth/users.server", () => ({
	userSessionGet: async () => currentUser,
}));

const venues = await import("./venues");

async function respond(query: string) {
	try {
		const result = await venues.loader({
			request: new Request(`http://test.local/api/untappd/venues?${query}`),
			params: {},
		} as never);
		return { status: 200, result };
	} catch (thrown) {
		return {
			status: (thrown as { init?: { status?: number } }).init?.status,
		};
	}
}

describe("venue search", () => {
	beforeEach(() => {
		getVenues.mockClear();
		currentUser = { id: 1, admin: false, untappd: { accessToken: "token" } };
	});

	it("searches Untappd with the user's own token, server-side", async () => {
		const { status } = await respond("lat=55.67&lng=12.56&q=mikkeller");

		expect(status).toBe(200);
		expect(getVenues).toHaveBeenCalledWith("token", 55.67, 12.56, "mikkeller");
	});

	it("requires an Untappd login", async () => {
		currentUser = { id: 1, admin: false };

		expect((await respond("lat=55.67&lng=12.56")).status).toBe(401);
		expect(getVenues).not.toHaveBeenCalled();
	});

	it.each(["lng=12.56", "lat=91&lng=12.56", "lat=x&lng=y"])(
		"rejects %s with a 400",
		async (query) => {
			expect((await respond(query)).status).toBe(400);
		},
	);
});
