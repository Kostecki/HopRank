import { data } from "react-router";

import { ERROR_CODES } from "~/utils/errors";

import { userSessionGet } from "./users.server";

/** Returns the logged-in user, or throws a 401. */
export async function requireUser(request: Request) {
	const user = await userSessionGet(request);
	if (!user) {
		throw data(
			{ message: "Du skal være logget ind", code: ERROR_CODES.UNAUTHORIZED },
			{ status: 401 },
		);
	}

	return user;
}
