import { type LoaderFunction, redirect } from "react-router";

import { authenticator } from "~/auth/auth.server";
import { commitSession, getSession } from "~/auth/session.server";

export const loader: LoaderFunction = async ({ request }) => {
  try {
    const user = await authenticator.authenticate("facebook", request);
    const session = await getSession(request.headers.get("cookie"));
    session.set("user", user);

    return redirect("/", {
      headers: { "Set-Cookie": await commitSession(session) },
    });
  } catch (error) {
    return redirect("auth/login");
  }
};
