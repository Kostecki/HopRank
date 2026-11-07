import { data } from "react-router";

import type { Route } from "./+types/check-in";

import { requireUser } from "~/auth/requireUser.server";
import { checkinSchema } from "~/schemas/checkin";
import { env } from "~/utils/env.server";
import { checkinBeer } from "~/utils/untappd";
import { parseFormFields } from "~/utils/validation.server";

export async function action({ request }: Route.ActionArgs) {
	const user = await requireUser(request);

	if (!user.untappd?.accessToken) {
		return data(
			{ message: "User not authenticated with Untappd" },
			{ status: 401 },
		);
	}

	const clientId = env.UNTAPPD_CLIENT_ID;

	const accessToken = user.untappd.accessToken;

	const form = await request.formData();
	const checkin = parseFormFields(form, checkinSchema, [
		"bid",
		"geolat",
		"geolng",
		"foursquare_id",
		"shout",
		"rating",
		"timezone",
		"gmt_offset",
	]);

	const response = await checkinBeer(checkin, clientId, accessToken);

	// Untappd failed, not us.
	if (!response.success) {
		return data({ message: "Untappd check-in fejlede" }, { status: 502 });
	}

	return data(response);
}
