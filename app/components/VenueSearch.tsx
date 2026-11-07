import {
	Box,
	type BoxProps,
	Combobox,
	Loader,
	TextInput,
	useCombobox,
} from "@mantine/core";
import { useEffect, useRef, useState } from "react";

import type { VenueDetails } from "~/types/oneBeer";

interface InputProps extends BoxProps {
	selectedVenue: string;
	onChange: (value: string, label?: string, details?: VenueDetails) => void;
	label?: string;
	placeholder?: string;
	excludeVenueIds?: string[];
	// Lets the dropdown extend past a modal or card that would clip it.
	withinPortal?: boolean;
	// Called with fresh results from Untappd, not with cached ones.
	onVenuesLoaded?: (venues: VenueItem[]) => void;
	// Shown in the list, but can't be selected.
	isVenueDisabled?: (venue: { value: string; label: string }) => boolean;
	lat: number;
	lng: number;
	priorityVenueIds: number[];
}

interface VenueItem {
	details?: VenueDetails;
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

const venuesCache = new Map<string, VenuesResponse>();

export default function VenueSearch({
	selectedVenue,
	onChange,
	label = "Lokation",
	placeholder = "Søg efter lokation",
	excludeVenueIds = [],
	withinPortal = false,
	onVenuesLoaded,
	isVenueDisabled,
	lat,
	lng,
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

	// Stop a pending search when the picker goes away.
	useEffect(
		() => () => {
			abortController.current?.abort();
			if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
		},
		[],
	);

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

		const { signal } = abortController.current;
		const params = new URLSearchParams({
			lat: String(lat),
			lng: String(lng),
			...(query ? { q: query } : {}),
		});

		fetch(`/api/untappd/venues?${params}`, { signal })
			.then((response) => {
				if (!response.ok) throw new Error(`Venue search ${response.status}`);
				return response.json() as Promise<VenuesResponse>;
			})
			.then((result) => {
				venuesCache.set(key, result);
				onVenuesLoaded?.(result.flatMap((group) => group.items));
				setData(result);
				setEmpty(result[0].items.length === 0 || result[1].items.length === 0);
			})
			.catch(() => {
				// A newer search replaced this one; that search sets the state.
				if (signal.aborted) return;
				setData(null);
				setEmpty(true);
			})
			.finally(() => {
				if (signal.aborted) return;
				setLoading(false);
				abortController.current = null;
			});
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
			{(data || []).map((group) => {
				const items = group.items.filter(
					(venue) => !excludeVenueIds.includes(venue.value),
				);

				if (items.length === 0) return null;

				return (
					<Combobox.Group key={group.label} label={group.label}>
						{items.map((venue) => (
							<Combobox.Option
								key={venue.value}
								value={venue.value}
								disabled={isVenueDisabled?.(venue)}
							>
								{venue.label}
								{isVenueDisabled?.(venue) && " • Allerede tilføjet"}
							</Combobox.Option>
						))}
					</Combobox.Group>
				);
			})}
		</>
	);

	return (
		<Box {...props}>
			<Combobox
				onOptionSubmit={(optionValue) => {
					const option = data
						?.flatMap((group) => group.items)
						.find((item) => item.value === optionValue);

					if (option?.label) {
						setValue(option.label);
					}

					combobox.closeDropdown();
					onChange(optionValue, option?.label, option?.details);
				}}
				withinPortal={withinPortal}
				store={combobox}
			>
				<Combobox.Target>
					<TextInput
						label={label}
						placeholder={placeholder}
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
