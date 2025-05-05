import { data } from "react-router";
import { eq, sql } from "drizzle-orm";
import { createNameId } from "mnemonic-id";

import { db } from "~/database/config.server";
import { sessions } from "~/database/schema.server";

import type { Route } from "./+types/uniqueName";

const titleCaseName = (name: string) => {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("-");
};

const checkIfNameExists = async (name: string) => {
  const existing = await db.query.sessions.findFirst({
    where: eq(sessions.name, name).append(sql` COLLATE NOCASE`),
  });

  return !!existing;
};

export async function action({ request }: Route.ActionArgs) {
  let name: string | null = null;

  const contentType = request.headers.get("content-type") ?? "";

  // Check if provided name is unique
  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const formData = await request.formData();
    const inputName = formData.get("name");

    if (typeof inputName === "string" && inputName.trim() !== "") {
      name = String(inputName);

      const existing = await checkIfNameExists(name);

      return data({ name, unique: !existing });
    }
  }

  // If no name is provided, generate a unique name
  let exists = true;
  while (exists) {
    name = titleCaseName(createNameId());
    exists = await checkIfNameExists(name);
  }

  return data({ name, unique: true });
}
