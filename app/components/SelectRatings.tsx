import {
	Box,
	Chip,
	Collapse,
	Divider,
	Group,
	Stack,
	Switch,
	Text,
} from "@mantine/core";
import { useEffect, useState } from "react";

import type { SelectCriteria as SelectCriteriaType } from "~/database/schema.types";

import { criteriaGroups } from "./NewSession";

type InputProps = {
	criteria: SelectCriteriaType[];
	activeCriteria: number[];
	setActiveCriteria: React.Dispatch<React.SetStateAction<number[]>>;
};

export default function SelectCriteria({
	criteria,
	activeCriteria,
	setActiveCriteria,
}: InputProps) {
	const [value, setValue] = useState("minimal");

	const handleGroupChange = (groupId: string) => {
		setValue(groupId);

		const group = criteriaGroups.find((group) => group.id === groupId);
		if (group) {
			setActiveCriteria(group.active);
		}
	};

	useEffect(() => {
		if (activeCriteria.length === 0) {
			setValue("");
			return;
		}

		const matchedGroup = criteriaGroups.find((group) => {
			return (
				group.active.length === activeCriteria.length &&
				group.active.every((id) => activeCriteria.includes(id))
			);
		});

		if (matchedGroup) {
			setValue(matchedGroup.id);
		} else {
			setValue("custom");
		}
	}, [activeCriteria]);

	return (
		<>
			<Text fw="bold" mt="xs">
				Smagnings-kriterier
			</Text>
			<Text size="sm" c="dimmed" fs="italic">
				Vælg hvilke kriterier øllene skal bedømmes efter
			</Text>

			<Box my="xs">
				<Chip.Group multiple={false} value={value} onChange={handleGroupChange}>
					<Group gap="xs">
						{criteriaGroups.map((group) => (
							<Chip
								key={group.id}
								value={group.id}
								size="xs"
								color="slateIndigo"
							>
								{group.name}
							</Chip>
						))}

						<Collapse in={value === "custom"} transitionDuration={150}>
							<Chip key="custom" value="custom" size="xs" color="slateIndigo">
								Manuel
							</Chip>
						</Collapse>
					</Group>
				</Chip.Group>
			</Box>

			<Divider opacity={0.3} />

			<Stack mt="md" gap="xs">
				{criteria.map((criteria) => (
					<Switch
						key={criteria.id}
						checked={activeCriteria.includes(criteria.id)}
						onChange={(event) => {
							const checked = event.currentTarget.checked;
							setActiveCriteria((prev) =>
								checked
									? [...prev, criteria.id]
									: prev.filter((id) => id !== criteria.id),
							);
						}}
						label={criteria.name}
						description={criteria.description}
						color="slateIndigo"
					/>
				))}
			</Stack>
		</>
	);
}
