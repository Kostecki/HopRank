import { z } from "zod";

/** A database id: a positive integer. Form fields arrive as strings. */
export const idSchema = z.coerce
	.number({ message: "Ugyldigt id" })
	.int("Ugyldigt id")
	.positive("Ugyldigt id");

/** A list of database ids, e.g. an order of bars. */
export const idListSchema = z.array(z.number().int().positive("Ugyldigt id"), {
	message: "Ugyldig liste",
});
