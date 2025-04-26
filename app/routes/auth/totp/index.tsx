import { useFetcher, useLoaderData, type MetaFunction } from "react-router";
import { useEffect, useState } from "react";

import TOTPVerify from "~/components/auth/TOTPVerify";

import { getPageTitle } from "~/utils/utils";

import { loader, action } from "./actions";
export { loader, action };

export const meta: MetaFunction = () => {
  return [{ title: getPageTitle("Verificér") }];
};

export default function VerifyLogin() {
  const loaderData = useLoaderData<typeof loader>();

  const [code, setCode] = useState("");

  const fetcher = useFetcher();

  const error = "error" in loaderData ? loaderData.error : null;
  const errors = fetcher.data?.error || error;

  useEffect(() => {
    if (code.length === 6) {
      fetcher.submit({ code }, { method: "post" });
    }
  }, [code]);

  return (
    <TOTPVerify
      code={code}
      setCode={setCode}
      fetcher={fetcher}
      errors={errors}
    />
  );
}
