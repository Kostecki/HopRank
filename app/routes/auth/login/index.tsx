import { redirect } from "react-router";

import { userSessionGet } from "~/auth/users.server";
import { authenticator } from "~/auth/auth.server";

import LoginForm from "~/components/auth/LoginForm";

import type { Route } from "../+types";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await userSessionGet(request);

  if (user) return redirect("/");

  return null;
}

export async function action({ request }: Route.ActionArgs) {
  try {
    return await authenticator.authenticate("TOTP", request);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error("error", error);

    return {
      error: "An error occurred during login. Please try again.",
    };
  }
}

export default function Login() {
  return <LoginForm />;
}
