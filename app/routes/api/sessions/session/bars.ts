import { data } from "react-router";

import type { BarSelection } from "~/types/oneBeer";
import type { Route } from "./+types/bars";

import { userSessionGet } from "~/auth/users.server";
import { requireSessionParticipant } from "~/database/utils/assertSessionAccess.server";
import { addBar, reorderQueue } from "~/database/utils/oneBeer.server";
import { extractSessionId } from "~/utils/utils";
import { emitGlobalEvent, emitSessionEvent } from "~/utils/websocket.server";

export async function action({ request, params }: Route.ActionArgs) {
	const sessionId = extractSessionId(params.sessionId);
	const user = await userSessionGet(request);

	if (!user) {
		return data({ message: "User not authenticated" }, { status: 401 });
	}

	await requireSessionParticipant(sessionId, user.id);

	const form = await request.formData();

	let result: ReturnType<typeof addBar>;

	if (request.method === "PATCH") {
		const barIds = JSON.parse(String(form.get("barIds"))) as number[];

		result = reorderQueue(sessionId, barIds);
	} else {
		const bar = JSON.parse(String(form.get("bar"))) as BarSelection;

		result = addBar(sessionId, user.id, {
			...bar,
			name: String(bar?.name ?? ""),
			foursquareId: bar?.foursquareId ?? null,
		});
	}

	if (!result.ok) {
		return data({ message: result.message }, { status: result.status });
	}

	emitSessionEvent(sessionId, "session:beer-changed");
	emitGlobalEvent("sessions:beer-changed", { sessionId });

	return data({ success: true });
}
