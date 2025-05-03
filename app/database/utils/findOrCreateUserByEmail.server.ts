import { eq } from "drizzle-orm";
import { db } from "../config.server";
import { users } from "../schema.server";

export const findOrCreateUserByEmail = async (
  email: string,
  untappdId?: number
) => {
  const insertedUsers = await db
    .insert(users)
    .values({ email, untappdId })
    .onConflictDoNothing()
    .returning();

  if (insertedUsers.length > 0) {
    return insertedUsers[0];
  }

  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!existingUser) {
    throw new Error("User not found after insert conflict");
  }

  return existingUser;
};
