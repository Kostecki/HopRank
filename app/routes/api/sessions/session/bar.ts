import { data } from "react-router";

import type { BarSelection } from "~/types/oneBeer";
import type { Route } from "./+types/bar";

import { userSessionGet } from "~/auth/users.server";
import { requireSessionParticipant } from "~/database/utils/assertSessionAccess.server";
import { correctBar, removeBar } from "~/database/utils/oneBeer.server";
import { extractSessionId } from "~/utils/utils";
import { emitGlobalEvent, emitSessionEvent } from "~/utils/websocket.server";

export async function action({ request, params }: Route.ActionArgs) {
	const sessionId = extractSessionId(params.sessionId);
	const barId = Number(params.barId);
	const user = await userSessionGet(request);

	if (!user) {
		return data({ message: "User not authenticated" }, { status: 401 });
	}

	if (!barId) {
		return data({ message: "Invalid bar ID" }, { status: 400 });
	}

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
		const bar = JSON.parse(String(form.get("bar"))) as BarSelection;

		result = correctBar(sessionId, barId, {
			...bar,
			name: String(bar?.name ?? ""),
			foursquareId: bar?.foursquareId ?? null,
		});
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
