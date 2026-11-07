import { and, eq, inArray, sql } from "drizzle-orm";
import { data, redirect } from "react-router";
import { z } from "zod";

import { SessionMode } from "~/types/session";
import type { Route } from "./+types/sessions";

import { requireUser } from "~/auth/requireUser.server";
import { db } from "~/database/config.server";
import { criteria, sessions } from "~/database/schema.server";
import type { SelectSessions } from "~/database/schema.types";
import { addBeersToSession } from "~/database/utils/addBeersToSession.server";
import { createSessionWithCriteria } from "~/database/utils/createSessionWithCriteria.server";
import { joinSessionById } from "~/database/utils/joinSessionById.server";
import { upsertBeer } from "~/database/utils/upsertBeer.server";
import { beerInputSchema } from "~/schemas/beer";
import {
	criterionIdsSchema,
	oneBeerSchema,
	sessionModeSchema,
	sessionNameSchema,
} from "~/schemas/session";
import { generateJoinCode } from "~/utils/utils";
import { parseFormJson, parseOrThrow } from "~/utils/validation.server";
import { emitGlobalEvent } from "~/utils/websocket.server";

export async function action({ request }: Route.ActionArgs) {
	const { id: userId } = await requireUser(request);

	const formData = await request.formData();

	const name = parseOrThrow(sessionNameSchema, formData.get("name") ?? "");
	const mode = parseOrThrow(
		sessionModeSchema,
		formData.get("mode") ?? undefined,
	);
	const isOneBeer = mode === SessionMode.oneBeer;

	// One Beer sessions have no criteria, and their one beer is required.
	// Normal sessions need criteria; beers can also be added later.
	const criterionIds = isOneBeer
		? []
		: parseFormJson(formData, "criteria", criterionIdsSchema);
	const beersInput = isOneBeer
		? parseFormJson(formData, "beers", oneBeerSchema)
		: formData.has("beers")
			? parseFormJson(formData, "beers", z.array(beerInputSchema))
			: [];

	if (criterionIds.length > 0) {
		const enabledCriteria = await db.query.criteria.findMany({
			where: and(
				inArray(criteria.id, criterionIds),
				eq(criteria.enabled, true),
			),
			columns: { id: true },
		});
		if (enabledCriteria.length !== criterionIds.length) {
			return data(
				{ message: "Et af de valgte kriterier findes ikke" },
				{ status: 400 },
			);
		}
	}

	const nameTaken = await db.query.sessions.findFirst({
		where: sql`lower(${sessions.name}) = lower(${name})`,
		columns: { id: true },
	});
	if (nameTaken) {
		return data(
			{ message: "Der findes allerede en smagning med det navn" },
			{ status: 400 },
		);
	}

	const beerId = isOneBeer ? await upsertBeer(beersInput[0]) : undefined;

	const generateUniqueJoinCode = async () => {
		let joinCode = generateJoinCode();
		let exists = true;
		while (exists) {
			const existingSession = await db
				.select()
				.from(sessions)
				.where(eq(sessions.joinCode, joinCode))
				.execute();

			if (existingSession.length === 0) {
				exists = false;
			} else {
				joinCode = generateJoinCode();
			}
		}
		return joinCode;
	};

	const isJoinCodeConflict = (error: unknown) =>
		error instanceof Error &&
		(error as Error & { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE";

	let session: SelectSessions | undefined;
	let lastError: unknown;

	// Retry once with a fresh join code: the uniqueness check above and the
	// insert aren't atomic, so a concurrent request can win the race.
	for (let attempt = 0; attempt < 2 && !session; attempt++) {
		const joinCode = await generateUniqueJoinCode();
		try {
			session = createSessionWithCriteria({
				name,
				createdBy: userId,
				joinCode,
				criterionIds,
				mode,
				beerId,
			});
		} catch (error) {
			lastError = error;
			if (!isJoinCodeConflict(error)) break;
		}
	}

	if (!session) {
		console.error("Unexpected DB error while creating session:", lastError);
		return data(
			{ message: "Kunne ikke oprette smagningen. Prøv igen senere." },
			{ status: 500 },
		);
	}

	try {
		await joinSessionById({
			sessionId: session.id,
			userId,
		});

		if (!isOneBeer && beersInput.length > 0) {
			await addBeersToSession(session.id, beersInput, userId);
		}

		emitGlobalEvent("sessions:created", { sessionId: session.id });

		return redirect(`/sessions/${session.id}`);
	} catch (error) {
		console.error("Error post-creation (join/add beers):", error);

		return data(
			{
				message:
					"Der skete en fejl under oprettelsen af smagningen. Prøv venligst igen.",
			},
			{ status: 500 },
		);
	}
}
