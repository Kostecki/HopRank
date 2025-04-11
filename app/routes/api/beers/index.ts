import { findBeers } from "../actions/search";

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") || "";

  const results = await findBeers(query);

  return results;
}
