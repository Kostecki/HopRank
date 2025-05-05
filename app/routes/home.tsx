import { Text } from "@mantine/core";
import { redirect, type MetaFunction } from "react-router";

import { userSessionGet } from "~/auth/users.server";

import type { Route } from "../+types/root";
import { getPageTitle } from "~/utils/utils";

export const meta: MetaFunction = () => {
  return [{ title: getPageTitle("Log ind") }];
};

export async function loader({ request }: Route.LoaderArgs) {
  const user = await userSessionGet(request);

  if (user) {
    return redirect("/sessions");
  }

  return redirect("/auth/login");
}

export default function Home() {
  return <Text>Redirecting..</Text>;
}
