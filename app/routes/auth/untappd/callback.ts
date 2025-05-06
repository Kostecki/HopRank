import { redirect, type LoaderFunction, type MetaFunction } from "react-router";

import { authenticator } from "~/auth/auth.server";

import { getPageTitle } from "~/utils/utils";

export const meta: MetaFunction = () => {
  return [{ title: getPageTitle("Log ind med Untappd") }];
};

export const loader: LoaderFunction = async ({ request }) => {
  console.log("Untappd callback loader", request);

  const isDev = import.meta.env.DEV;

  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return redirect("/auth/login");
  }

  const referer = request.headers.get("referer") || "";
  const cameFromLocalhost = referer.includes("localhost");

  const isAlreadyOnLocalhost =
    url.hostname === "localhost" || url.hostname === "127.0.0.1";

  console.log("referer", referer);
  console.log("cameFromLocalhost", cameFromLocalhost);
  console.log("isAlreadyOnLocalhost", isAlreadyOnLocalhost);

  if (cameFromLocalhost && !isAlreadyOnLocalhost && isDev) {
    const localhostURL = new URL("http://localhost:5173/auth/untappd/callback");
    localhostURL.searchParams.set("code", code);

    console.log("Redirecting to localhost:", localhostURL.toString());
    return redirect(localhostURL.toString());
  }

  try {
    return await authenticator.authenticate("Untappd", request);
  } catch (error) {
    console.error("Untappd callback error", error);
    return redirect("/auth/login");
  }
};
