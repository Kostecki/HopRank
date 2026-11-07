// In-memory and per-process, which is enough for a single server instance.

type Window = { count: number; resetAt: number };

export function createFailureLimiter({
	maxFailures,
	windowMs,
}: {
	maxFailures: number;
	windowMs: number;
}) {
	const windows = new Map<string, Window>();

	const current = (key: string, now: number) => {
		const window = windows.get(key);
		if (window && window.resetAt > now) return window;

		windows.delete(key);
		return undefined;
	};

	return {
		isLimited(key: string, now = Date.now()) {
			return (current(key, now)?.count ?? 0) >= maxFailures;
		},

		recordFailure(key: string, now = Date.now()) {
			const window = current(key, now);
			if (window) {
				window.count++;
			} else {
				windows.set(key, { count: 1, resetAt: now + windowMs });
			}

			// Keep the map from growing without bound.
			if (windows.size > 10_000) {
				for (const [k, w] of windows) {
					if (w.resetAt <= now) windows.delete(k);
				}
			}
		},
	};
}

/** Wrong join codes per user: 10 per 10 minutes. */
export const joinCodeLimiter = createFailureLimiter({
	maxFailures: 10,
	windowMs: 10 * 60 * 1000,
});
