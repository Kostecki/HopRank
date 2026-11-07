import { data } from "react-router";

import type { Route } from "./+types/bar";

import { requireUser } from "~/auth/requireUser.server";
import { requireSessionParticipant } from "~/database/utils/assertSessionAccess.server";
import { correctBar, removeBar } from "~/database/utils/oneBeer.server";
import { idSchema } from "~/schemas/common";
import { barSelectionSchema } from "~/schemas/oneBeer";
import { extractSessionId } from "~/utils/utils";
import { parseFormJson, parseOrThrow } from "~/utils/validation.server";
import { emitGlobalEvent, emitSessionEvent } from "~/utils/websocket.server";

export async function action({ request, params }: Route.ActionArgs) {
	const sessionId = extractSessionId(params.sessionId);
	const barId = parseOrThrow(idSchema, params.barId);
	const user = await requireUser(request);

	await requireSessionParticipant(sessionId, user.id);

	let result: ReturnType<typeof removeBar>;

	if (request.method === "DELETE") {
		result = removeBar(sessionId, barId, user);
	} else if (request.method === "PATCH") {
		if (!user.untappd?.accessToken) {
			return data(
				{ message: "Du skal være logget ind med Untappd for at rette en bar" },
				{ status: 403 },
			);
		}

		const form = await request.formData();
		const bar = parseFormJson(form, "bar", barSelectionSchema);

		result = correctBar(sessionId, barId, bar);
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
