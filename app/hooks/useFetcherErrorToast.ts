import { useEffect } from "react";

import { showDangerToast } from "~/utils/toasts";

type FetcherLike = { state: string; data: unknown };

/**
 * Shows the server's error message (or the fallback) when a fetcher finishes
 * with an error. Responses with `success: true` and redirects show nothing.
 */
export function useFetcherErrorToast(fetcher: FetcherLike, fallback: string) {
	const { state, data } = fetcher;

	useEffect(() => {
		if (state !== "idle" || !data || typeof data !== "object") return;

		const result = data as { success?: boolean; message?: unknown };
		if (result.success) return;

		showDangerToast(
			typeof result.message === "string" ? result.message : fallback,
		);
	}, [state, data, fallback]);
}
