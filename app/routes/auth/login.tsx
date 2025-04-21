import { type LoaderFunction, type MetaFunction, redirect } from "react-router";
import { Grid } from "@mantine/core";

import { authenticator } from "~/auth/auth.server";
import { userSessionGet } from "~/auth/users.server";

import TotpForm from "~/components/auth/TotpForm";

import { getPageTitle } from "~/utils/utils";

import type { Route } from "./+types";

export const meta: MetaFunction = () => {
  return [{ title: getPageTitle("Log ind") }];
};

export const loader: LoaderFunction = async ({ request }) => {
  const user = await userSessionGet(request);
  if (user) throw redirect("/sessions");

  return null;
};

export async function action({ request }: Route.ActionArgs) {
  try {
    return await authenticator.authenticate("TOTP", request);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    return {
      error: "An error occurred during login. Please try again.",
    };
  }
}

export default function Login() {
  return (
    <Grid justify="center" pt={80}>
      <Grid.Col span={10}>
        <TotpForm />
      </Grid.Col>
    </Grid>
  );
}
