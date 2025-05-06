import { redirect, type LoaderFunction, type MetaFunction } from "react-router";

import { authenticator } from "~/auth/auth.server";

import { getPageTitle } from "~/utils/utils";

export const meta: MetaFunction = () => {
  return [{ title: getPageTitle("Log ind med Untappd") }];
};

export const loader: LoaderFunction = async ({ request }) => {
  console.log("Untappd callback loader", request);

  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return redirect("/auth/login");
  }

  // Option 1: Use a custom query param to indicate dev
  const isDev = import.meta.env.DEV;

  // Option 2: Check Referer header for localhost
  const referer = request.headers.get("referer") || "";
  const cameFromLocalhost = referer.includes("localhost");

  if (isDev || cameFromLocalhost) {
    // Forward to localhost with the code
    const localhostURL = new URL("http://localhost:5173/auth/untappd/callback");
    localhostURL.searchParams.set("code", code);

    return redirect(localhostURL.toString());
  }

  try {
    return await authenticator.authenticate("Untappd", request);
  } catch (error) {
    console.error("Untappd callback error", error);
    return redirect("/auth/login");
  }
};
