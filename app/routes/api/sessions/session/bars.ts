import { data } from "react-router";

import type { Route } from "./+types/bars";

import { requireUser } from "~/auth/requireUser.server";
import { requireSessionParticipant } from "~/database/utils/assertSessionAccess.server";
import { addBar, reorderQueue } from "~/database/utils/oneBeer.server";
import { idListSchema } from "~/schemas/common";
import { barSelectionSchema } from "~/schemas/oneBeer";
import { extractSessionId } from "~/utils/utils";
import { parseFormJson } from "~/utils/validation.server";
import { emitGlobalEvent, emitSessionEvent } from "~/utils/websocket.server";

export async function action({ request, params }: Route.ActionArgs) {
	const sessionId = extractSessionId(params.sessionId);
	const user = await requireUser(request);

	await requireSessionParticipant(sessionId, user.id);

	const form = await request.formData();

	let result: ReturnType<typeof addBar>;

	if (request.method === "PATCH") {
		const barIds = parseFormJson(form, "barIds", idListSchema);

		result = reorderQueue(sessionId, barIds);
	} else if (request.method === "POST") {
		const bar = parseFormJson(form, "bar", barSelectionSchema);

		result = addBar(sessionId, user.id, bar);
	} else {
		return data({ message: "Method not allowed" }, { status: 405 });
	}

	if (!result.ok) {
		return data({ message: result.message }, { status: result.status });
	}

	emitSessionEvent(sessionId, "session:beer-changed");
	emitGlobalEvent("sessions:beer-changed", { sessionId });

	return data({ success: true });
}
