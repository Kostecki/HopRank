import { Button, Stack } from "@mantine/core";
import { useState } from "react";
import { useFetcher } from "react-router";

import type { BarSelection } from "~/types/oneBeer";
import type { SessionUser } from "~/types/user";

import { useFetcherResult } from "~/hooks/useFetcherResult";

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

	const { state } = fetcher;

	useFetcherResult(fetcher, {
		errorMessage: "Kunne ikke tilføje baren",
		onSuccess: () => {
			setSelection(null);
			setPickerKey((key) => key + 1);
			onAdded?.();
		},
	});

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
