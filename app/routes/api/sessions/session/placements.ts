import { data } from "react-router";

import type { Route } from "./+types/placements";

import { userSessionGet } from "~/auth/users.server";
import { requireSessionParticipant } from "~/database/utils/assertSessionAccess.server";
import { savePlacements } from "~/database/utils/oneBeer.server";
import { extractSessionId } from "~/utils/utils";
import { emitSessionEvent } from "~/utils/websocket.server";

export async function action({ request, params }: Route.ActionArgs) {
	const sessionId = extractSessionId(params.sessionId);
	const user = await userSessionGet(request);

	if (!user) {
		return data({ message: "User not authenticated" }, { status: 401 });
	}

	await requireSessionParticipant(sessionId, user.id);

	const form = await request.formData();
	const barIds = JSON.parse(String(form.get("barIds"))) as number[];

	const result = savePlacements(sessionId, user.id, barIds);

	if (!result.ok) {
		return data({ message: result.message }, { status: result.status });
	}

	emitSessionEvent(sessionId, "session:vote");

	return data({ success: true });
}
