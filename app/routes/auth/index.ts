import { type LoaderFunctionArgs, redirect } from "react-router";

import { userSessionGet } from "~/auth/users.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await userSessionGet(request);

  if (user) {
    return redirect("/");
  }

  return redirect("/auth/login");
}
