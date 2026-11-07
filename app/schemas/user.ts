import { z } from "zod";

export const USER_NAME_MAX_LENGTH = 50;

export const userNameSchema = z
	.string({ message: "Navn er påkrævet" })
	.trim()
	.min(1, "Navn er påkrævet")
	.max(
		USER_NAME_MAX_LENGTH,
		`Navnet må højst være ${USER_NAME_MAX_LENGTH} tegn`,
	);
