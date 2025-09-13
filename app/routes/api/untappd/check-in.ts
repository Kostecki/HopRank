import { data } from "react-router";
import { userSessionGet } from "~/auth/users.server";
import { invariant } from "~/utils/invariant";
import { checkinBeer } from "~/utils/untappd";
import type { Route } from "./+types/check-in";

export async function action({ request }: Route.ActionArgs) {
  const user = await userSessionGet(request);

  if (!user) {
    return data({ message: "User not authenticated" }, { status: 401 });
  }

  if (!user.untappd?.accessToken) {
    return data(
      { message: "User not authenticated with Untappd" },
      { status: 401 }
    );
  }

  console.log("user", user);

  const clientId = process.env.UNTAPPD_CLIENT_ID;
  invariant(clientId, "UNTAPPD_CLIENT_ID is not set in environment variables");

  const accessToken = user.untappd.accessToken;

  const form = await request.formData();
  const checkin = {
    bid: String(form.get("bid")),
    rating: String(form.get("rating")),
    geolat: String(form.get("geolat")),
    geolng: String(form.get("geolng")),
    checkin_tags: String(form.get("checkin_tags")),
    foursquare_id: String(form.get("foursquare_id")),
    container_id: String(form.get("container_id")),
    shout: String(form.get("shout") || ""),
    timezone: String(form.get("timezone")),
    gmt_offset: String(form.get("gmt_offset")),
  };

  const response = await checkinBeer(checkin, clientId, accessToken);

  if (!response.success) {
    return data(
      { message: response.error || "Failed to check in beer" },
      { status: 500 }
    );
  }

  return data(response);
}
