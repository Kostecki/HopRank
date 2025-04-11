import { count, desc, eq } from "drizzle-orm";
import { db } from "./config.server";
import {
  beersTable,
  ratingsTable,
  sessionsTable,
  usersTable,
  votesTable,
} from "./schema.server";

const getRatings = async () => {
  return await db.select().from(ratingsTable);
};

const getActiveSessions = async () => {
  const activeSessions = await db
    .select({
      id: sessionsTable.id,
      name: sessionsTable.name,
      active: sessionsTable.active,
      createdAt: sessionsTable.createdAt,
      updatedAt: sessionsTable.updatedAt,
      userCount: count(usersTable.id).as("userCount"),
    })
    .from(sessionsTable)
    .leftJoin(usersTable, eq(usersTable.activeSessionId, sessionsTable.id))
    .where(eq(sessionsTable.active, true))
    .groupBy(sessionsTable.id)
    .orderBy(desc(sessionsTable.createdAt));

  return activeSessions;
};

const getSessionDetails = async (sessionId: number) => {
  const [sessionDetails] = await db
    .select({
      id: sessionsTable.id,
      name: sessionsTable.name,
      active: sessionsTable.active,
      createdAt: sessionsTable.createdAt,
      updatedAt: sessionsTable.updatedAt,
      userCount: count(usersTable.id).as("userCount"),
    })
    .from(sessionsTable)
    .leftJoin(usersTable, eq(usersTable.activeSessionId, sessionsTable.id))
    .where(eq(sessionsTable.id, sessionId))
    .groupBy(sessionsTable.id)
    .orderBy(desc(sessionsTable.createdAt));

  return sessionDetails;
};

const getSessionBeers = async (sessionId: number) => {
  const sessionBeers = await db
    .select()
    .from(beersTable)
    .where(eq(beersTable.sessionId, sessionId));

  return sessionBeers;
};

const getSessionVotes = async (sessionId: number) => {
  const sessionVotes = await db
    .select()
    .from(votesTable)
    .where(eq(votesTable.sessionId, sessionId));

  return sessionVotes;
};

export {
  getRatings,
  getActiveSessions,
  getSessionDetails,
  getSessionBeers,
  getSessionVotes,
};
