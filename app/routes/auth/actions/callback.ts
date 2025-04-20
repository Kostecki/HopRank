import { type LoaderFunction, redirect } from "react-router";
import { authenticator } from "~/auth/auth.server";
import { commitSession, getSession } from "~/auth/session.server";

export const loader: LoaderFunction = async ({ request }) => {
  try {
    const user = await authenticator.authenticate("facebook", request);
    const session = await getSession(request.headers.get("cookie"));

    session.set("user", user);

    const cookie = await commitSession(session);

    return redirect("/", {
      headers: {
        "Set-Cookie": cookie,
      },
    });
  } catch (error) {
    console.error("Authentication error:", error);
    return redirect("/auth/login");
  }
};
