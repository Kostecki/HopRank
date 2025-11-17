import type { LoaderFunction, MetaFunction } from "react-router";

import { authenticator } from "~/auth/auth.server";
import { getPageTitle } from "~/utils/utils";

export const meta: MetaFunction = () => {
  return [{ title: getPageTitle("Log ind med Untappd") }];
};

export const loader: LoaderFunction = ({ request }) => {
  return authenticator.authenticate("Untappd", request);
};
