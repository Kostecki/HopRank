import {
	ActionIcon,
	Box,
	type BoxProps,
	Button,
	Divider,
	SegmentedControl,
	Stack,
	Text,
	TextInput,
} from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { useFetcher } from "react-router";

import type { BeerOption } from "~/types/misc";
import { SessionMode } from "~/types/session";

import type { SelectCriteria } from "~/database/schema.types";
import { useFetcherResult } from "~/hooks/useFetcherResult";

import BeerMultiSelect from "./BeerMultiSelect";
import BeerSelect from "./BeerSelect";
import SelectRatings from "./SelectRatings";

type InputProps = {
	criteria: SelectCriteria[];
} & BoxProps;

export const criteriaGroups = [
	{
		id: "minimal",
		name: "Minimal",
		active: [1],
	},
	{
		id: "simple",
		name: "Simpel",
		active: [1, 2, 3],
	},
	{
		id: "extended",
		name: "Udvidet",
		active: [1, 2, 3, 4, 5],
	},
];

const modes = [
	{
		value: SessionMode.normal,
		label: "Normal",
		description: "Smag forskellige øl og giv dem point.",
	},
	{
		value: SessionMode.oneBeer,
		label: "One Beer",
		description:
			"Den samme øl på forskellige barer. Hver deltager rangerer barerne på sin egen liste.",
	},
];

export default function NewSession({ criteria, ...props }: InputProps) {
	const [mode, setMode] = useState<SessionMode>(SessionMode.normal);
	const [selectedBeers, setSelectedBeers] = useState<BeerOption[]>([]);
	const [activeCriteria, setActiveCriteria] = useState<number[]>(() => {
		const group = criteriaGroups.find((group) => group.id === "minimal");
		return group?.active ?? [];
	});
	const [sessionName, setSessionName] = useState("");
	const [hasTouchedName, setHasTouchedName] = useState(false);

	const newSessionFetcher = useFetcher();
	const uniqueNameFetcher = useFetcher();
	useFetcherResult(newSessionFetcher, {
		errorMessage: "Smagningen kunne ikke oprettes",
	});

	const newSessionLoader = newSessionFetcher.state !== "idle";

	const handleSubmit = () => {
		const formData = new FormData();
		formData.append("name", sessionName);
		formData.append("mode", mode);
		formData.append("beers", JSON.stringify(selectedBeers));
		formData.append("criteria", JSON.stringify(activeCriteria));

		newSessionFetcher.submit(formData, {
			method: "POST",
			action: "/api/sessions",
		});
	};

	const fetchName = useCallback(
		async (name?: string) => {
			const formData = new FormData();
			if (name) formData.append("name", name);

			uniqueNameFetcher.submit(formData, {
				method: "POST",
				action: "/api/sessions/unique-name",
			});
		},
		[uniqueNameFetcher.submit],
	);

	const handleModeChange = (value: string) => {
		const newMode = value as SessionMode;
		setMode(newMode);

		if (newMode === SessionMode.oneBeer) {
			setSelectedBeers((beers) => beers.slice(0, 1));
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSessionName(e.currentTarget.value);
		setHasTouchedName(true);
	};

	useEffect(() => {
		fetchName();
	}, [fetchName]);

	useEffect(() => {
		const timeout = setTimeout(() => {
			if (sessionName) {
				fetchName(sessionName);
			}
		}, 300);

		return () => clearTimeout(timeout);
	}, [sessionName, fetchName]);

	useEffect(() => {
		if (uniqueNameFetcher.data?.name && uniqueNameFetcher.data?.unique) {
			setSessionName(uniqueNameFetcher.data.name);
		}
	}, [uniqueNameFetcher.data]);

	const isOneBeer = mode === SessionMode.oneBeer;
	const noCriteriaSelected = activeCriteria.length === 0;
	const isMissingSetup = isOneBeer
		? selectedBeers.length !== 1
		: noCriteriaSelected;
	const nameNotUnique =
		uniqueNameFetcher.data?.name === sessionName &&
		uniqueNameFetcher.data?.unique === false;
	const nameIsEmpty = sessionName.trim() === "";

	return (
		<Box {...props}>
			<Divider opacity={0.5} my="xl" />

			<Text fw="bold">Ny smagning</Text>

			<Stack mt="xs">
				<Stack gap={5}>
					<SegmentedControl
						fullWidth
						color="slateIndigo"
						value={mode}
						onChange={handleModeChange}
						data={modes.map(({ value, label }) => ({ value, label }))}
					/>
					<Text size="sm" c="dimmed" fs="italic">
						{modes.find(({ value }) => value === mode)?.description}
					</Text>
				</Stack>

				<Stack gap={5}>
					<Text size="sm" c="dimmed">
						Giv smagningen et navn eller behold det tilfældigt genererede navn
					</Text>

					<TextInput
						value={sessionName}
						onChange={handleInputChange}
						rightSection={
							<ActionIcon
								variant="light"
								color="slateIndigo"
								onClick={() => fetchName()}
								aria-label="Find på et nyt navn"
							>
								<IconRefresh size={14} />
							</ActionIcon>
						}
						error={
							hasTouchedName && nameIsEmpty
								? "Smagningen skal have et navn"
								: nameNotUnique
									? "Navnet på smagningen skal være unikt"
									: undefined
						}
					/>
				</Stack>

				<Stack gap={5}>
					<Text size="sm" c="dimmed" fs="italic">
						{isOneBeer
							? "Søg efter øllen til smagningen"
							: "Du kan tilføje øl direkte til smagningen ved at søge efter dem herunder"}
					</Text>

					{isOneBeer ? (
						<BeerSelect
							value={selectedBeers[0] ?? null}
							onChange={(beer) => setSelectedBeers(beer ? [beer] : [])}
						/>
					) : (
						<BeerMultiSelect
							selectedBeers={selectedBeers}
							setSelectedBeers={setSelectedBeers}
						/>
					)}
				</Stack>

				{!isOneBeer && (
					<Stack gap={0}>
						<SelectRatings
							criteria={criteria}
							activeCriteria={activeCriteria}
							setActiveCriteria={setActiveCriteria}
						/>
					</Stack>
				)}

				<Button
					color="slateIndigo"
					fullWidth
					radius="md"
					onClick={handleSubmit}
					mt="md"
					disabled={isMissingSetup || nameIsEmpty || nameNotUnique}
					loading={newSessionLoader}
				>
					🍻 Opret smagning 🍻
				</Button>
			</Stack>
		</Box>
	);
}
