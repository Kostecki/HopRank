import { z } from "zod";

import { isValidVoteScore } from "~/utils/utils";

import { idSchema } from "./common";

export const voteSchema = z.object(
	{
		sessionId: idSchema,
		userId: idSchema,
		beerId: idSchema,
		ratings: z
			.array(
				z.object({
					criterionId: z.number().int().positive(),
					score: z
						.number()
						.refine(isValidVoteScore, { message: "Invalid score in vote" }),
				}),
			)
			.min(1, "Invalid vote data"),
	},
	{ error: "Invalid vote data" },
);

export const kickVoteSchema = z.object({
	voteId: z.string().min(1, "Afstemningen findes ikke længere"),
	vote: z.enum(["true", "false"]).transform((vote) => vote === "true"),
});
