import { findBeers } from "~/actions/algolia";

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";

  const results = await findBeers(search);

  return results;

  return new Response(JSON.stringify(results), {
    headers: {
      "Content-Type": "application/json",
    },
  });
}
