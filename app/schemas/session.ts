import { z } from "zod";

import { SessionMode } from "~/types/session";

import { beerInputSchema } from "./beer";

export const SESSION_NAME_MAX_LENGTH = 100;

export const sessionNameSchema = z
	.string()
	.trim()
	.min(1, "Smagningen skal have et navn")
	.max(
		SESSION_NAME_MAX_LENGTH,
		`Navnet må højst være ${SESSION_NAME_MAX_LENGTH} tegn`,
	);

export const sessionModeSchema = z
	.enum(SessionMode)
	.default(SessionMode.normal);

export const criterionIdsSchema = z
	.array(z.number().int().positive())
	.min(1, "En smagning skal have mindst ét bedømmelseskriterie.")
	.refine((ids) => new Set(ids).size === ids.length, {
		message: "Et kriterie er valgt mere end én gang",
	});

/** Beers added to a normal session: at least one. */
export const beersToAddSchema = z
	.array(beerInputSchema)
	.min(1, "Ingen øl valgt");

/** The beer of a One Beer session: exactly one. */
export const oneBeerSchema = z
	.array(beerInputSchema)
	.length(1, "Vælg øllen til smagningen.");
