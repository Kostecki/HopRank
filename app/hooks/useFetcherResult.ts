import { useEffect, useRef } from "react";

import { showDangerToast } from "~/utils/toasts";

type FetcherLike = { state: string; data: unknown };

type Options = {
	/** Called once a submission succeeds (`success: true`). */
	onSuccess?: (data: unknown) => void;
	/** Called after the error toast when a submission fails. */
	onError?: (message: string) => void;
	/** Shown when the server's error has no message. */
	errorMessage: string;
};

/**
 * Handles each finished submission of a fetcher exactly once: `onSuccess` on
 * `success: true`, otherwise a toast with the server's message (or
 * `errorMessage`) and `onError`. A redirect leaves no data, so nothing runs.
 */
export function useFetcherResult(fetcher: FetcherLike, options: Options) {
	const optionsRef = useRef(options);
	const handledData = useRef<unknown>(null);

	useEffect(() => {
		optionsRef.current = options;
	});

	const { state, data } = fetcher;

	useEffect(() => {
		if (state !== "idle" || !data || data === handledData.current) return;
		handledData.current = data;

		const result = data as { success?: boolean; message?: unknown };
		if (result.success) {
			optionsRef.current.onSuccess?.(data);
			return;
		}

		const message =
			typeof result.message === "string"
				? result.message
				: optionsRef.current.errorMessage;
		showDangerToast(message);
		optionsRef.current.onError?.(message);
	}, [state, data]);
}
