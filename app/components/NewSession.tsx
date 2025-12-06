import {
	ActionIcon,
	Box,
	type BoxProps,
	Button,
	Divider,
	Stack,
	Text,
	TextInput,
} from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { useFetcher } from "react-router";

import type { BeerOption } from "~/types/misc";

import type { SelectCriteria } from "~/database/schema.types";

import BeerMultiSelect from "./BeerMultiSelect";
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

export default function NewSession({ criteria, ...props }: InputProps) {
	const [selectedBeers, setSelectedBeers] = useState<BeerOption[]>([]);
	const [activeCriteria, setActiveCriteria] = useState<number[]>(() => {
		const group = criteriaGroups.find((group) => group.id === "minimal");
		return group?.active ?? [];
	});
	const [sessionName, setSessionName] = useState("");
	const [hasTouchedName, setHasTouchedName] = useState(false);

	const newSessionFetcher = useFetcher();
	const uniqueNameFetcher = useFetcher();

	const newSessionLoader = newSessionFetcher.state !== "idle";

	const handleSubmit = () => {
		const formData = new FormData();
		formData.append("name", sessionName);
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

	const noCriteriaSelected = activeCriteria.length === 0;
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
						Du kan tilføje øl direkte til smagningen ved at søge efter dem
						herunder
					</Text>

					<BeerMultiSelect
						selectedBeers={selectedBeers}
						setSelectedBeers={setSelectedBeers}
					/>
				</Stack>

				<Stack gap={0}>
					<SelectRatings
						criteria={criteria}
						activeCriteria={activeCriteria}
						setActiveCriteria={setActiveCriteria}
					/>
				</Stack>

				<Button
					color="slateIndigo"
					fullWidth
					radius="md"
					onClick={handleSubmit}
					mt="md"
					disabled={noCriteriaSelected || nameIsEmpty || nameNotUnique}
					loading={newSessionLoader}
				>
					🍻 Opret ny smagning 🍻
				</Button>
			</Stack>
		</Box>
	);
}
