import {
	Box,
	type BoxProps,
	Combobox,
	Loader,
	TextInput,
	useCombobox,
} from "@mantine/core";
import { useRef, useState } from "react";

import { getVenues } from "~/utils/untappd";

interface InputProps extends BoxProps {
	selectedVenue: string;
	onChange: (value: string) => void;
	lat: number;
	lng: number;
	untappdAccessToken: string;
	priorityVenueIds: number[];
}

interface VenueItem {
	value: string;
	label: string;
}

interface VenueGroup {
	label: string;
	items: VenueItem[];
}

type VenuesResponse = [VenueGroup, VenueGroup];

const normalizeQuery = (query: string) =>
	query
		.trim()
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\p{Diacritic}]/gu, "");

const venuesCache = new Map<string, Awaited<ReturnType<typeof getVenues>>>();

export default function VenueSearch({
	selectedVenue,
	onChange,
	lat,
	lng,
	untappdAccessToken,
	priorityVenueIds,
	...props
}: InputProps) {
	const combobox = useCombobox({
		onDropdownOpen: () => combobox.resetSelectedOption(),
	});

	const [loading, setLoading] = useState(false);
	const [data, setData] = useState<VenuesResponse | null>(null);
	const [value, setValue] = useState("");
	const [empty, setEmpty] = useState(false);

	const abortController = useRef<AbortController | null>(null);
	const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

	const fetchOptions = (query: string) => {
		const key = `${lat},${lng},${normalizeQuery(query)}`;

		const cached = venuesCache.get(key);
		if (cached) {
			if (Array.isArray(cached)) {
				setData(cached);
				setEmpty(cached[0].items.length === 0 || cached[1].items.length === 0);
			} else {
				setData(null);
				setEmpty(true);
			}

			return;
		}

		abortController.current?.abort();
		abortController.current = new AbortController();
		setLoading(true);

		getVenues(untappdAccessToken, lat, lng, query)
			.then((result) => {
				venuesCache.set(key, result);
				setData(result);
				setLoading(false);
				setEmpty(result[0].items.length === 0 || result[1].items.length === 0);
				abortController.current = null;
			})
			.catch(() => {});
	};

	const fetchOptionsDebounced = (query: string) => {
		if (debounceTimeout.current) {
			clearTimeout(debounceTimeout.current);
		}

		debounceTimeout.current = setTimeout(() => {
			fetchOptions(query);
		}, 300);
	};

	const options = (
		<>
			{(data || []).map((group) => (
				<Combobox.Group key={group.label} label={group.label}>
					{group.items.map((venue) => (
						<Combobox.Option key={venue.value} value={venue.value}>
							{venue.label}
						</Combobox.Option>
					))}
				</Combobox.Group>
			))}
		</>
	);

	return (
		<Box {...props}>
			<Combobox
				onOptionSubmit={(optionValue) => {
					const label = data
						?.flatMap((group) => group.items)
						.find((item) => item.value === optionValue)?.label;

					if (label) {
						setValue(label);
					}

					combobox.closeDropdown();
					onChange(optionValue);
				}}
				withinPortal={false}
				store={combobox}
			>
				<Combobox.Target>
					<TextInput
						label="Lokation"
						placeholder="Søg efter lokation"
						value={value}
						onChange={(event) => {
							setValue(event.currentTarget.value);
							fetchOptionsDebounced(event.currentTarget.value);
							combobox.resetSelectedOption();
							combobox.openDropdown();
						}}
						onClick={() => combobox.openDropdown()}
						onFocus={() => {
							combobox.openDropdown();

							if (data === null) {
								fetchOptions(value);
							}
						}}
						rightSection={loading && <Loader size={18} />}
					/>
				</Combobox.Target>

				<Combobox.Dropdown hidden={data === null}>
					<Combobox.Options mah={300} style={{ overflowY: "auto" }}>
						{options}
						{empty && <Combobox.Empty>Ingen resultater</Combobox.Empty>}
					</Combobox.Options>
				</Combobox.Dropdown>
			</Combobox>
		</Box>
	);
}
