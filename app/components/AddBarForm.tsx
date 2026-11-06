import { Button, Stack } from "@mantine/core";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";

import type { BarSelection } from "~/types/oneBeer";
import type { SessionUser } from "~/types/user";

import { showDangerToast } from "~/utils/toasts";

import BarPicker from "./BarPicker";

type InputProps = {
	user: SessionUser;
	sessionId: number;
	onAdded?: () => void;
};

export default function AddBarForm({ user, sessionId, onAdded }: InputProps) {
	const [selection, setSelection] = useState<BarSelection | null>(null);
	// Remounting the picker is what clears its input after a bar is added.
	const [pickerKey, setPickerKey] = useState(0);

	const fetcher = useFetcher();

	const handleSubmit = () => {
		if (!selection) return;

		const formData = new FormData();
		formData.append("bar", JSON.stringify(selection));

		fetcher.submit(formData, {
			method: "POST",
			action: `/api/sessions/${sessionId}/bars`,
		});
	};

	const { data, state } = fetcher;

	useEffect(() => {
		if (state !== "idle" || !data) return;

		const result = data as { success?: boolean; message?: string };
		const fetcherWithReset = fetcher as typeof fetcher & {
			reset?: () => void;
		};

		if (result.success) {
			setSelection(null);
			setPickerKey((key) => key + 1);
			onAdded?.();
		} else {
			showDangerToast(result.message ?? "Kunne ikke tilføje baren");
		}

		fetcherWithReset.reset?.();
	}, [state, data, fetcher, onAdded]);

	return (
		<Stack mt="xs">
			<BarPicker
				key={pickerKey}
				user={user}
				sessionId={sessionId}
				onChange={setSelection}
			/>

			<Button
				color="slateIndigo"
				fullWidth
				radius="md"
				onClick={handleSubmit}
				disabled={!selection}
				loading={state !== "idle"}
			>
				Tilføj bar til smagningen
			</Button>
		</Stack>
	);
}
