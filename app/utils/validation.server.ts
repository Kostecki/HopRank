import { data } from "react-router";
import type { z } from "zod";

import { ERROR_CODES } from "./errors";

const validationError = (message: string) =>
	data({ message, code: ERROR_CODES.VALIDATION }, { status: 400 });

/** The first issue's message, which is what the user sees. */
const firstMessage = (error: z.ZodError) =>
	error.issues[0]?.message ?? "Ugyldige data";

/** Validates a value against a schema, throwing a 400 when it doesn't match. */
export function parseOrThrow<T extends z.ZodType>(
	schema: T,
	value: unknown,
): z.infer<T> {
	const result = schema.safeParse(value);
	if (!result.success) {
		throw validationError(firstMessage(result.error));
	}

	return result.data;
}

/**
 * Parses a form field holding JSON and validates it, throwing a 400 when the
 * field is missing, isn't valid JSON, or doesn't match the schema.
 */
export function parseFormJson<T extends z.ZodType>(
	form: FormData,
	key: string,
	schema: T,
): z.infer<T> {
	const raw = form.get(key);
	if (typeof raw !== "string") {
		throw validationError(`Mangler ${key}`);
	}

	let value: unknown;
	try {
		value = JSON.parse(raw);
	} catch {
		throw validationError(`Ugyldig ${key}`);
	}

	return parseOrThrow(schema, value);
}
