import { useCallback, useEffect } from "react";
import { useFetcher } from "react-router";

import type { SessionBar } from "~/types/oneBeer";

import { showDangerToast } from "~/utils/toasts";

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

	useEffect(() => {
		if (fetcher.state !== "idle" || !fetcher.data) return;

		const result = fetcher.data as { success?: boolean; message?: string };

		if (!result.success) {
			showDangerToast(result.message ?? "Kunne ikke fjerne baren");
		}
	}, [fetcher.state, fetcher.data]);

	return { removeBar, isRemoving: fetcher.state !== "idle" };
}
