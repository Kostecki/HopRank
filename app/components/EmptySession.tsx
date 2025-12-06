import { Button, Paper, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import { useFetcher, useParams } from "react-router";

import type { BeerOption } from "~/types/misc";

import type { SelectBeers } from "~/database/schema.types";
import { showDangerToast } from "~/utils/toasts";

import BeerMultiSelect from "./BeerMultiSelect";

type InputProps = {
	sessionBeers: SelectBeers[];
	onBeersUpdated?: () => void;
};

export default function EmptySession({
	sessionBeers,
	onBeersUpdated,
}: InputProps) {
	const { sessionId } = useParams();
	const [selectedBeers, setSelectedBeers] = useState<BeerOption[]>([]);

	const fetcher = useFetcher();

	const handleSubmit = () => {
		if (!sessionId) {
			return;
		}

		const formData = new FormData();
		formData.append("beers", JSON.stringify(selectedBeers));

		fetcher.submit(formData, {
			method: "POST",
			action: `/api/sessions/${sessionId}/add`,
		});

		setSelectedBeers([]);
	};

	const { data, state } = fetcher;

	useEffect(() => {
		if (state !== "idle" || !data) {
			return;
		}

		const result = data as { success?: boolean; message?: string };
		const fetcherWithReset = fetcher as typeof fetcher & {
			reset?: () => void;
		};
		if (result.success) {
			onBeersUpdated?.();
			fetcherWithReset.reset?.();
			return;
		}

		if (result.message) {
			showDangerToast(result.message);
		}
		fetcherWithReset.reset?.();
	}, [state, data, fetcher, onBeersUpdated]);

	return (
		<Paper p="md" radius="md" withBorder mt={64}>
			<Text fw="bold">Smagningen har ingen øl :(</Text>
			<Text c="dimmed" size="sm" fs="italic">
				Du kan tilføje øl ved at søge efter dem herunder
			</Text>

			<BeerMultiSelect
				my="lg"
				selectedBeers={selectedBeers}
				setSelectedBeers={setSelectedBeers}
				sessionBeers={sessionBeers}
			/>

			<Button
				color="slateIndigo"
				fullWidth
				radius="md"
				onClick={handleSubmit}
				disabled={!selectedBeers.length}
				loading={state === "submitting"}
			>
				Tilføj øl til smagningen
			</Button>
		</Paper>
	);
}
