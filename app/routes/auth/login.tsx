import {
  data,
  type LoaderFunction,
  type MetaFunction,
  redirect,
} from "react-router";
import { Grid } from "@mantine/core";

import { userSessionGet } from "~/auth/users.server";

import LoginForm from "~/components/auth/Login";
import { getPageTitle } from "~/utils/utils";

export const meta: MetaFunction = () => {
  return [{ title: getPageTitle("Log ind") }];
};

export const loader: LoaderFunction = async ({ request }) => {
  const user = await userSessionGet(request);
  if (user) throw redirect("/");

  return data(null);
};

export default function Login() {
  return (
    <Grid justify="center" pt={80}>
      <Grid.Col span={10}>
        <LoginForm />
      </Grid.Col>
    </Grid>
  );
}
