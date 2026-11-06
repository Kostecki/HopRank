import {
	CloseButton,
	Combobox,
	Group,
	Loader,
	Text,
	TextInput,
	useCombobox,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";

import type { BeerOption } from "~/types/misc";

import BeerThumbnail from "./BeerThumbnail";
import { RankCard } from "./RankCard";

type InputProps = {
	value: BeerOption | null;
	onChange: (beer: BeerOption | null) => void;
};

export default function BeerSelect({ value, onChange }: InputProps) {
	const combobox = useCombobox({
		onDropdownClose: () => combobox.resetSelectedOption(),
	});

	const [searchTerm, setSearchTerm] = useState("");
	const [debouncedSearchTerm] = useDebouncedValue(searchTerm, 500);

	const searchFetcher = useFetcher<BeerOption[]>();
	const options = searchFetcher.data ?? [];
	const isLoading =
		searchFetcher.state === "loading" && searchTerm.trim().length > 0;

	useEffect(() => {
		if (debouncedSearchTerm.trim() && combobox.dropdownOpened) {
			searchFetcher.load(
				`/api/untappd/beers?q=${encodeURIComponent(debouncedSearchTerm)}`,
			);
		}
	}, [debouncedSearchTerm, combobox.dropdownOpened, searchFetcher.load]);

	if (value) {
		return (
			<RankCard
				image={value.label}
				title={value.name}
				subtitle={value.breweryName}
				detail={value.style}
			>
				<CloseButton
					aria-label="Vælg en anden øl"
					size="sm"
					pos="absolute"
					top={4}
					right={4}
					onClick={() => onChange(null)}
				/>
			</RankCard>
		);
	}

	return (
		<Combobox
			store={combobox}
			withinPortal={true}
			onOptionSubmit={(untappdBeerId) => {
				const beer = options.find((b) => b.untappdBeerId === untappdBeerId);
				if (!beer) return;

				onChange(beer);
				setSearchTerm("");
				combobox.closeDropdown();
			}}
		>
			<Combobox.Target>
				<TextInput
					placeholder="Søg efter øl"
					value={searchTerm}
					onChange={(event) => {
						setSearchTerm(event.currentTarget.value);
						combobox.updateSelectedOptionIndex();
						combobox.openDropdown();
					}}
					onFocus={() => combobox.openDropdown()}
					onClick={() => combobox.openDropdown()}
					onBlur={() => combobox.closeDropdown()}
					rightSection={isLoading && <Loader size={16} />}
				/>
			</Combobox.Target>

			<Combobox.Dropdown>
				<Combobox.Options mah={400} style={{ overflowY: "auto" }}>
					{searchTerm.trim() === "" ? (
						<Combobox.Empty>
							Start med at skrive for at søge efter øl
						</Combobox.Empty>
					) : options.length === 0 ? (
						<Combobox.Empty>Ingen matchende øl fundet</Combobox.Empty>
					) : (
						options.map((option) => (
							<Combobox.Option
								key={option.untappdBeerId}
								value={option.untappdBeerId}
							>
								<Group gap="sm" wrap="nowrap">
									<BeerThumbnail src={option.label} />
									<div>
										<Text size="sm">{option.name}</Text>
										<Text size="xs" c="gray">
											{option.breweryName}
										</Text>
									</div>
								</Group>
							</Combobox.Option>
						))
					)}
				</Combobox.Options>
			</Combobox.Dropdown>
		</Combobox>
	);
}
