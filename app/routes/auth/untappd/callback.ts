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
  console.log("isDev", isDev);

  // Option 2: Check Referer header for localhost
  const referer = request.headers.get("referer") || "";
  console.log("referer", referer);
  const cameFromLocalhost = referer.includes("localhost");
  console.log("cameFromLocalhost", cameFromLocalhost);

  if (isDev || cameFromLocalhost) {
    console.log("Came from localhost, redirecting to localhost");
    // Forward to localhost with the code
    const localhostURL = new URL("http://localhost:5173/auth/untappd/callback");
    console.log("localhostURL", localhostURL);
    localhostURL.searchParams.set("code", code);
    console.log("localhostURL with code", localhostURL);

    console.log("Redirecting to localhost");
    return redirect(localhostURL.toString());
  }

  try {
    return await authenticator.authenticate("Untappd", request);
  } catch (error) {
    console.error("Untappd callback error", error);
    return redirect("/auth/login");
  }
};
