import { eq } from "drizzle-orm";
import { db } from "../config.server";
import { users } from "../schema.server";

export const findOrCreateUserByEmail = async (
  email: string,
  untappdId?: number,
  username?: string,
  name?: string,
  avatar?: string
) => {
  const userEmail = email.trim().toLowerCase();

  // Set admin state based on list of emails in env var
  const ADMIN_USER_EMAILS = process.env.ADMIN_USER_EMAILS || "";
  const adminEmails = ADMIN_USER_EMAILS.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
  const isAdmin = adminEmails.includes(userEmail);

  const insertedUsers = await db
    .insert(users)
    .values({
      email: userEmail,
      untappdId,
      username,
      name,
      avatarURL: avatar,
      admin: isAdmin,
    })
    .onConflictDoNothing()
    .returning();

  if (insertedUsers.length > 0) {
    return insertedUsers[0];
  }

  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, userEmail))
    .limit(1);

  if (avatar && existingUser && existingUser.avatarURL !== avatar) {
    await db
      .update(users)
      .set({ avatarURL: avatar })
      .where(eq(users.id, existingUser.id));
    existingUser.avatarURL = avatar;
  }

  if (!existingUser) {
    throw new Error("User not found after insert conflict");
  }

  return existingUser;
};
