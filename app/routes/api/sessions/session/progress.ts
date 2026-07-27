import { data } from "react-router";

import type { Route } from "./+types/progress";

import { getSessionProgress } from "~/database/utils/getSessionProgress.server";
import { extractSessionId } from "~/utils/utils";

export async function loader({ request, params }: Route.LoaderArgs) {
	const sessionId = extractSessionId(params.sessionId);

	const result = await getSessionProgress({ request, sessionId });

	if ("statusCode" in result) {
		return data({ message: result.error }, { status: result.statusCode });
	}

	return data(result);
}
