import { userSessionGet } from "~/auth/users.server";
import type { UntappdVenue } from "~/types/untappd";
import type { Route } from "./+types/venues";

const UNTAPPD_AT_HOME_VENUE_ID = 9917985;

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const lat = url.searchParams.get("lat");
  const lng = url.searchParams.get("lng");

  if (!lat || !lng) {
    throw new Response("Missing latitude or longitude", { status: 400 });
  }

  const session = await userSessionGet(request);
  const accessToken = session?.untappd?.accessToken;
  if (!accessToken) {
    throw new Response("Missing access token", { status: 401 });
  }

  const apiURL = new URL("https://api.untappd.com/v4/venue/around");
  apiURL.searchParams.set("access_token", accessToken);
  apiURL.searchParams.set("lat", lat);
  apiURL.searchParams.set("lng", lng);
  const response = await fetch(apiURL);

  if (!response.ok) {
    throw new Response("Failed to fetch venues", { status: response.status });
  }

  const { response: data } = await response.json();

  console.log("Venues data:", data);

  const untappdAtHome = data.recent.items.find(
    (venue: UntappdVenue) => venue.venue_id === UNTAPPD_AT_HOME_VENUE_ID
  );
  const venues = [untappdAtHome, ...data.foursquare.items];

  return venues;
}
