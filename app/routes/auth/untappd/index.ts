import { authenticator } from "~/auth/auth.server";
import type { LoaderFunction } from "react-router";

export const loader: LoaderFunction = ({ request }) => {
  return authenticator.authenticate("Untappd", request);
};
