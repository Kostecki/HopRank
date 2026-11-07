import { Button, Paper, Text } from "@mantine/core";
import { useState } from "react";
import { useFetcher, useParams } from "react-router";

import type { BeerOption } from "~/types/misc";

import type { SelectBeers } from "~/database/schema.types";
import { useFetcherResult } from "~/hooks/useFetcherResult";

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
	};

	const { state } = fetcher;

	useFetcherResult(fetcher, {
		errorMessage: "Kunne ikke tilføje øl",
		onSuccess: () => {
			setSelectedBeers([]);
			onBeersUpdated?.();
		},
	});

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
