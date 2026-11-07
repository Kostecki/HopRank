import { Box, Button, Modal, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { createContext, useContext, useMemo, useState } from "react";
import { useFetcher } from "react-router";

import type { BeerOption } from "~/types/misc";
import type { SessionProgress } from "~/types/session";

import type {
	SelectBeers,
	SelectSessionBeersWithBeer,
} from "~/database/schema.types";
import { useFetcherResult } from "~/hooks/useFetcherResult";
import { showSuccessToast } from "~/utils/toasts";

import BeerMultiSelect from "../BeerMultiSelect";

type InputProps = {
	children: React.ReactNode;
	sessionProgress?: SessionProgress;
	sessionBeers: SelectSessionBeersWithBeer[];
	onBeersUpdated?: () => void;
};

const ModalAddBeersContext = createContext<() => void>(() => {});

export function ModalAddBeersTrigger({
	children,
}: {
	children: React.ReactNode;
}) {
	const open = useContext(ModalAddBeersContext);

	return (
		<Box
			onClick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				open();
			}}
		>
			{children}
		</Box>
	);
}

export default function ModalAddBeers({
	children,
	sessionProgress,
	sessionBeers,
	onBeersUpdated,
}: InputProps) {
	const [opened, { open, close }] = useDisclosure(false);
	const [selectedBeers, setSelectedBeers] = useState<BeerOption[]>([]);

	const submitFetcher = useFetcher();

	const sessionId = sessionProgress?.sessionId;

	const selectableSessionBeers = useMemo<SelectBeers[]>(
		() => sessionBeers.map((item) => item.beer),
		[sessionBeers],
	);

	const handleSubmit = async () => {
		if (!selectedBeers.length) return;
		if (!sessionId) return;

		const formData = new FormData();
		formData.append("beers", JSON.stringify(selectedBeers));

		submitFetcher.submit(formData, {
			method: "POST",
			action: `/api/sessions/${sessionId}/add`,
		});
	};

	const { state } = submitFetcher;

	useFetcherResult(submitFetcher, {
		errorMessage: "Kunne ikke tilføje øl",
		onSuccess: () => {
			setSelectedBeers([]);
			close();
			showSuccessToast("Øl tilføjet til smagningen");
			onBeersUpdated?.();
		},
	});

	return (
		<ModalAddBeersContext.Provider value={open}>
			{children}

			<Modal.Root opened={opened} onClose={close}>
				<Modal.Overlay />
				<Modal.Content>
					<Modal.Header>
						<Modal.Title fw="500">Udvid smagningen</Modal.Title>
						<Modal.CloseButton />
					</Modal.Header>
					<Modal.Body>
						<Stack mt="xs">
							<BeerMultiSelect
								selectedBeers={selectedBeers}
								setSelectedBeers={setSelectedBeers}
								sessionBeers={selectableSessionBeers}
								currentBeerId={sessionProgress?.currentBeer?.beerId}
							/>

							<Button
								color="slateIndigo"
								fullWidth
								radius="md"
								onClick={handleSubmit}
								loading={state !== "idle"}
								disabled={selectedBeers.length === 0}
							>
								Tilføj valgte øl
							</Button>
						</Stack>
					</Modal.Body>
				</Modal.Content>
			</Modal.Root>
		</ModalAddBeersContext.Provider>
	);
}
