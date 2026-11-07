import { useCallback } from "react";
import { useFetcher } from "react-router";

import type { SessionBar } from "~/types/oneBeer";

import { useFetcherResult } from "~/hooks/useFetcherResult";

export function useRemoveBar(sessionId: number) {
	const fetcher = useFetcher();

	const removeBar = useCallback(
		(bar: SessionBar) => {
			const confirmed =
				bar.placementCount === 0 ||
				window.confirm(
					`Vil du fjerne ${bar.name}? Alle rangeringer af baren bliver slettet.`,
				);

			if (!confirmed) return;

			fetcher.submit(null, {
				method: "DELETE",
				action: `/api/sessions/${sessionId}/bars/${bar.id}`,
			});
		},
		[fetcher.submit, sessionId],
	);

	useFetcherResult(fetcher, { errorMessage: "Kunne ikke fjerne baren" });

	return { removeBar, isRemoving: fetcher.state !== "idle" };
}
