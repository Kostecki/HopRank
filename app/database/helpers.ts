import { count, desc, eq, sql } from "drizzle-orm";
import { redirect } from "react-router";
import { createNameId } from "mnemonic-id";

import { db } from "./config.server";
import {
  beersTable,
  ratingsTable,
  sessionsTable,
  usersTable,
  votesTable,
} from "./schema.server";

type SessionActivity = {
  sessionId: number;
  lastActivity: string;
};

const getRatings = async () => {
  return await db.select().from(ratingsTable);
};

const getSessions = async () => {
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

const leaveSession = async (userId: number) => {
  await db
    .update(usersTable)
    .set({ activeSessionId: null })
    .where(eq(usersTable.id, userId));

  return redirect("/");
};

const MAX_ATTEMPTS = 5;
const generateUniqueSessionName = async () => {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const name = createNameId();

    const existing = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.name, name))
      .limit(1);

    if (existing.length === 0) {
      return name;
    }
  }

  throw new Error(
    "Failed to generate a unique session name after several attempts"
  );
};

const getSessionLastActivity = async () => {
  const result = (await db
    .select({
      sessionId: sql<number>`session_id`,
      lastActivity: sql<string>`MAX(created_at)`,
    })
    .from(
      sql`(
    SELECT session_id, created_at from ${beersTable}
    UNION ALL
    SELECT session_id, created_at from ${votesTable}
  )`
    )
    .groupBy(sql`session_id`)) as unknown as SessionActivity[];

  const activityMap = new Map<number, Date>();

  for (const row of result) {
    if (row.lastActivity) {
      activityMap.set(row.sessionId, new Date(row.lastActivity));
    }
  }

  return activityMap;
};

const getBeersCountPerSession = async () => {
  const result = await db
    .select({
      sessionId: beersTable.sessionId,
      beersCount: count().as("beersCount"),
    })
    .from(beersTable)
    .groupBy(beersTable.sessionId);

  const map = new Map<number, number>();
  result.forEach((row) => map.set(row.sessionId, row.beersCount));

  return map;
};

export {
  getRatings,
  getSessions,
  getSessionDetails,
  getSessionBeers,
  getSessionVotes,
  leaveSession,
  generateUniqueSessionName,
  getSessionLastActivity,
  getBeersCountPerSession,
};
