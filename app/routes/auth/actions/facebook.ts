import type { LoaderFunction } from "react-router";

import { authenticator } from "~/auth/auth.server";

export const loader: LoaderFunction = ({ request }) => {
  return authenticator.authenticate("facebook", request);
};
