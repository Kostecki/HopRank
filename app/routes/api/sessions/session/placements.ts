import { data } from "react-router";

import type { Route } from "./+types/placements";

import { requireUser } from "~/auth/requireUser.server";
import { requireSessionParticipant } from "~/database/utils/assertSessionAccess.server";
import { savePlacements } from "~/database/utils/oneBeer.server";
import { idListSchema } from "~/schemas/common";
import { extractSessionId } from "~/utils/utils";
import { parseFormJson } from "~/utils/validation.server";
import { emitSessionEvent } from "~/utils/websocket.server";

export async function action({ request, params }: Route.ActionArgs) {
	const sessionId = extractSessionId(params.sessionId);
	const user = await requireUser(request);

	await requireSessionParticipant(sessionId, user.id);

	const form = await request.formData();
	const barIds = parseFormJson(form, "barIds", idListSchema);

	const result = savePlacements(sessionId, user.id, barIds);

	if (!result.ok) {
		return data({ message: result.message }, { status: result.status });
	}

	emitSessionEvent(sessionId, "session:vote");

	return data({ success: true });
}
