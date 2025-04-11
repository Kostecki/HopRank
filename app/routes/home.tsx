import { Text } from "@mantine/core";
import { redirect } from "react-router";

import { userSessionGet } from "~/auth/users.server";

import type { Route } from "../+types/root";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await userSessionGet(request);

  if (user) {
    return redirect("/sessions");
  } else {
    return redirect("/auth/login");
  }
}

export default function Home() {
  return <Text>Redirecting..</Text>;
}
