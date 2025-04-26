import { authenticator } from "~/auth/auth.server";
import { redirect, type LoaderFunction } from "react-router";

export const loader: LoaderFunction = ({ request }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return redirect("/auth/login");
  }

  try {
    return authenticator.authenticate("Untappd", request);
  } catch (error) {
    console.error("Untappd callback error", error);
    return redirect("/auth/login");
  }
};
