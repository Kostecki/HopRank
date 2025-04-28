import { count, desc, eq, sql, not, isNull, and } from "drizzle-orm";
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

export const getRatings = async () => {
  return await db.select().from(ratingsTable);
};

export const getSessions = async () => {
  const sessions = await db
    .select({
      id: sessionsTable.id,
      name: sessionsTable.name,
      active: sessionsTable.active,
      createdAt: sessionsTable.createdAt,
      updatedAt: sessionsTable.updatedAt,
    })
    .from(sessionsTable)
    .orderBy(desc(sessionsTable.createdAt));

  const userRows = await db
    .select({
      sessionId: usersTable.activeSessionId,
      untappdId: usersTable.untappdId,
    })
    .from(usersTable)
    .where(not(isNull(usersTable.activeSessionId)));

  const usersBySessionId = userRows.reduce((acc, user) => {
    if (user.sessionId == null || user.untappdId == null) return acc;

    if (!acc[user.sessionId]) {
      acc[user.sessionId] = [];
    }
    acc[user.sessionId].push(user.untappdId);
    return acc;
  }, {} as Record<number, number[]>);

  const enrichedSessions = sessions.map((session) => {
    const untappdUserIds = usersBySessionId[session.id] || [];

    return {
      ...session,
      users: {
        totalCount: untappdUserIds.length,
        untappdUserIds: untappdUserIds as number[],
      },
    };
  });

  console.log("balls", enrichedSessions);

  return enrichedSessions;
};

export const getSessionDetails = async (sessionId: number) => {
  const [sessionDetails] = await db
    .select({
      id: sessionsTable.id,
      name: sessionsTable.name,
      active: sessionsTable.active,
      createdAt: sessionsTable.createdAt,
      updatedAt: sessionsTable.updatedAt,
    })
    .from(sessionsTable)
    .where(eq(sessionsTable.id, sessionId));

  const untappdIds = await db
    .select({ untappdId: usersTable.untappdId })
    .from(usersTable)
    .where(
      and(
        eq(usersTable.activeSessionId, sessionId),
        not(isNull(usersTable.untappdId))
      )
    );

  return {
    ...sessionDetails,
    users: {
      totalCount: untappdIds.length,
      untappdUserIds: untappdIds
        .map((u) => u.untappdId)
        .filter((id): id is number => id !== null),
    },
  };
};

export const getSessionBeers = async (sessionId: number) => {
  const sessionBeers = await db
    .select()
    .from(beersTable)
    .where(eq(beersTable.sessionId, sessionId));

  return sessionBeers;
};

export const getSessionVotes = async (sessionId: number) => {
  const sessionVotes = await db
    .select()
    .from(votesTable)
    .where(eq(votesTable.sessionId, sessionId));

  return sessionVotes;
};

export const leaveSession = async (userId: number) => {
  await db
    .update(usersTable)
    .set({ activeSessionId: null })
    .where(eq(usersTable.id, userId));

  return redirect("/");
};

const MAX_ATTEMPTS = 5;
export const generateUniqueSessionName = async () => {
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

export const getSessionLastActivity = async () => {
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

export const getBeersCountPerSession = async () => {
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

export const getUsersWithSession = async (sessionId: number) => {
  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.activeSessionId, sessionId));

  return users;
};
