import { Text } from "@mantine/core";
import { redirect, type LoaderFunction } from "react-router";
import { userSessionGet } from "~/auth/users.server";

export async function loader({ request }: { request: Request }) {
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
