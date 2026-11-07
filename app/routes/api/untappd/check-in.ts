import { data } from "react-router";

import type { Route } from "./+types/check-in";

import { userSessionGet } from "~/auth/users.server";
import { env } from "~/utils/env.server";
import { checkinBeer } from "~/utils/untappd";

export async function action({ request }: Route.ActionArgs) {
	const user = await userSessionGet(request);

	if (!user) {
		return data({ message: "User not authenticated" }, { status: 401 });
	}

	if (!user.untappd?.accessToken) {
		return data(
			{ message: "User not authenticated with Untappd" },
			{ status: 401 },
		);
	}

	const clientId = env.UNTAPPD_CLIENT_ID;

	const accessToken = user.untappd.accessToken;

	const form = await request.formData();
	const checkin = {
		bid: String(form.get("bid")),
		rating: String(form.get("rating") || ""),
		geolat: String(form.get("geolat")),
		geolng: String(form.get("geolng")),
		foursquare_id: String(form.get("foursquare_id")),
		shout: String(form.get("shout") || ""),
		timezone: String(form.get("timezone")),
		gmt_offset: String(form.get("gmt_offset")),
	};

	const response = await checkinBeer(checkin, clientId, accessToken);

	if (!response.success) {
		return data(
			{ message: response.error || "Failed to check in beer" },
			{ status: 500 },
		);
	}

	return data(response);
}
