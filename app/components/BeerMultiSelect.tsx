import {
	Box,
	type BoxProps,
	CheckIcon,
	CloseButton,
	Combobox,
	Group,
	Loader,
	Pill,
	PillsInput,
	ScrollArea,
	Text,
	useCombobox,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useEffect, useMemo, useState } from "react";
import { useRef } from "react";
import { useFetcher } from "react-router";

import type { SelectBeers } from "~/database/schema.types";
import type { BeerOption } from "~/types/misc";
import type { RatedBeers } from "~/types/session";

type InputProps = {
	selectedBeers: BeerOption[];
	setSelectedBeers: (value: BeerOption[]) => void;
	sessionBeers?: SelectBeers[] | RatedBeers[];
	currentBeerId?: number;
} & BoxProps;

const getSelectedPills = (
	selectedBeers: BeerOption[],
	onRemove: (val: string) => void,
) => {
	return selectedBeers.map((beer) => (
		<Pill
			key={beer.untappdBeerId}
			withRemoveButton
			onRemove={() => onRemove(beer.untappdBeerId)}
		>
			{beer.name}
		</Pill>
	));
};

const getComboboxOptions = (
	options: BeerOption[],
	selectedBeers: BeerOption[],
	sessionBeers?: SelectBeers[] | RatedBeers[],
	currentBeerId?: number,
) => {
	return options.map((option) => {
		const isSelected = selectedBeers.some(
			(b) => b.untappdBeerId === option.untappdBeerId,
		);

		const isAlreadyInSession =
			sessionBeers?.some(
				(b) => String(b.untappdBeerId) === option.untappdBeerId,
			) || option.untappdBeerId === String(currentBeerId);

		return (
			<Combobox.Option
				key={option.untappdBeerId}
				value={option.untappdBeerId}
				active={isSelected}
				disabled={isAlreadyInSession}
			>
				<Group gap="sm">
					{isSelected && <CheckIcon size={12} />}
					<Box>
						<Text size="sm">{option.name}</Text>
						<Text size="xs" c="gray" mt="3">
							{option.breweryName}
							{isAlreadyInSession && " • Allerede tilføjet til smagningen"}
						</Text>
					</Box>
				</Group>
			</Combobox.Option>
		);
	});
};

export default function BeerMultiSelect({
	selectedBeers,
	setSelectedBeers,
	sessionBeers,
	currentBeerId,
	...props
}: InputProps) {
	const combobox = useCombobox({
		onDropdownClose: () => combobox.resetSelectedOption(),
		onDropdownOpen: () => combobox.updateSelectedOptionIndex("active"),
	});

	const [searchTerm, setSearchTerm] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	const searchFetcher = useFetcher<BeerOption[]>();

	const handleValueSelect = (val: string) => {
		const selectedBeer = options.find((beer) => beer.untappdBeerId === val);
		const isBeerAlreadySelected = selectedBeers.some(
			(beer) => beer.untappdBeerId === val,
		);

		if (isBeerAlreadySelected) {
			handleValueRemove(val);
		} else if (selectedBeer) {
			setSelectedBeers([...selectedBeers, selectedBeer]);
		}

		setSearchTerm("");
	};

	const handleValueRemove = (val: string) => {
		setSelectedBeers(
			selectedBeers.filter((beer) => beer.untappdBeerId !== val),
		);
	};

	// Use the debounced search term
	const [debouncedSearchTerm] = useDebouncedValue(searchTerm, 500);

	useEffect(() => {
		if (debouncedSearchTerm.trim() && combobox.dropdownOpened) {
			searchFetcher.load(`/api/untappd/beers?q=${debouncedSearchTerm}`);
		}
	}, [debouncedSearchTerm, combobox.dropdownOpened, searchFetcher.load]);

	const options = searchFetcher.data || [];
	const isLoading =
		searchFetcher.state === "loading" && searchTerm.trim().length > 0;

	const values = getSelectedPills(selectedBeers, handleValueRemove);
	const optionsList = useMemo(
		() =>
			getComboboxOptions(options, selectedBeers, sessionBeers, currentBeerId),
		[options, selectedBeers, sessionBeers, currentBeerId],
	);

	return (
		<Box {...props}>
			<Combobox
				store={combobox}
				onOptionSubmit={handleValueSelect}
				withinPortal={true}
			>
				<Combobox.DropdownTarget>
					<PillsInput onClick={() => combobox.openDropdown()}>
						<Combobox.EventsTarget>
							<PillsInput.Field
								onFocus={() => combobox.openDropdown()}
								onBlur={() => combobox.closeDropdown()}
								value={searchTerm}
								placeholder="Søg efter øl"
								onChange={(event) => {
									combobox.updateSelectedOptionIndex();
									setSearchTerm(event.currentTarget.value);
								}}
								w="100%"
								ref={inputRef}
							/>
						</Combobox.EventsTarget>
						{isLoading && (
							<Loader
								size={16}
								style={{
									position: "absolute",
									right: 10,
									top: "50%",
									transform: "translateY(-50%)",
								}}
							/>
						)}
						{!isLoading && searchTerm.length > 0 && optionsList.length > 0 && (
							<CloseButton
								size="sm"
								onMouseDown={(event) => event.preventDefault()}
								onClick={() => {
									combobox.closeDropdown();
									setSearchTerm("");
								}}
								pos="absolute"
								right={10}
							/>
						)}
					</PillsInput>
				</Combobox.DropdownTarget>

				<Combobox.Dropdown>
					<Combobox.Options>
						<ScrollArea.Autosize mah={400} type="scroll">
							{searchTerm.trim() === "" ? (
								<Combobox.Empty>
									Start med at skrive for at søge efter øl
								</Combobox.Empty>
							) : options.length === 0 ? (
								<Combobox.Empty>Ingen matchende øl fundet</Combobox.Empty>
							) : (
								optionsList
							)}
						</ScrollArea.Autosize>
					</Combobox.Options>
				</Combobox.Dropdown>
			</Combobox>
			{values.length > 0 && (
				<Box mb="sm" mt="sm">
					<Text size="sm" c="dimmed" mb={8}>
						Valgte øl:
					</Text>
					<Pill.Group>{values}</Pill.Group>
				</Box>
			)}
		</Box>
	);
}
