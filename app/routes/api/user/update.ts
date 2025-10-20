import { eq } from "drizzle-orm";
import { data } from "react-router";
import { commitSession, getSession } from "~/auth/session.server";
import { userSessionGet } from "~/auth/users.server";
import { db } from "~/database/config.server";
import { users } from "~/database/schema.server";
import type { Route } from "./+types/update";

export async function action({ request }: Route.ActionArgs) {
  const user = await userSessionGet(request);
  if (!user) {
    return Response.json(
      { status: 401, message: "You must be logged in" },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const name = formData.get("name");
    if (typeof name !== "string" || name.trim() === "") {
      return Response.json(
        { status: 400, message: "Name is required" },
        { status: 400 }
      );
    }

    await db.update(users).set({ name }).where(eq(users.id, user.id));

    const updatedSessionUser = {
      ...user,
      name: name.trim(),
    };

    const session = await getSession(request.headers.get("Cookie"));
    session.set("user", updatedSessionUser);
    const sessionCookie = await commitSession(session);

    return data(
      {
        status: 200,
        message: "Profile updated successfully",
        user: updatedSessionUser,
      },
      {
        status: 200,
        headers: { "Set-Cookie": sessionCookie },
      }
    );
  } catch (error) {
    console.error("Error updating name:", error);
    return data({ status: 500, message: "An error occurred" }, { status: 500 });
  }
}
