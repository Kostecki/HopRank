import { Anchor, Box, type BoxProps, Text, TextInput } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { useRouteLoaderData } from "react-router";

import type { BarSelection, VenueDetails } from "~/types/oneBeer";
import type { SessionUser } from "~/types/user";

import { useGeolocation } from "~/hooks/useGeolocation";
import type { loader as layoutLoader } from "~/routes/layout";
import { findDuplicateBar } from "~/utils/oneBeerRanking";
import { UAH_VENUE_ID } from "~/utils/untappd";

import VenueSearch from "./VenueSearch";

type InputProps = {
	user: SessionUser;
	sessionId: number;
	// The bar being changed, which isn't a duplicate of itself.
	ignoreBarId?: number;
	onChange: (bar: BarSelection | null) => void;
	// False when the point is to find the bar through search.
	allowTyped?: boolean;
} & BoxProps;

const EXCLUDED_VENUES = [UAH_VENUE_ID];

// Fire and forget: a failure here only means the saved details stay as they
// are until the next search. Not a fetcher, so that a search doesn't reload the
// page's data. If anything changed, the server tells everyone over the socket.
const syncVenues = (
	sessionId: number,
	venues: { value: string; label: string; details?: VenueDetails }[],
) => {
	const formData = new FormData();
	formData.append(
		"venues",
		JSON.stringify(
			venues.map(({ value, label, details }) => ({
				name: label,
				foursquareId: value,
				...details,
			})),
		),
	);

	fetch(`/api/sessions/${sessionId}/bars-sync`, {
		method: "POST",
		body: formData,
	}).catch(() => {});
};

export default function BarPicker({
	user,
	sessionId,
	ignoreBarId,
	onChange,
	allowTyped = true,
	...props
}: InputProps) {
	const accessToken = user.untappd?.accessToken;
	const sessionBars =
		useRouteLoaderData<typeof layoutLoader>("routes/layout")?.sessionBars ?? [];

	const [isTyping, setIsTyping] = useState(!accessToken);
	const [typedName, setTypedName] = useState("");

	const { location, requestLocation } = useGeolocation();
	const hasRequestedLocation = useRef(false);

	useEffect(() => {
		if (accessToken && !hasRequestedLocation.current) {
			hasRequestedLocation.current = true;
			requestLocation();
		}
	}, [accessToken, requestLocation]);

	const switchInput = (typing: boolean) => {
		setIsTyping(typing);
		setTypedName("");
		onChange(null);
	};

	if (isTyping) {
		return (
			<Box {...props}>
				<TextInput
					label="Bar"
					placeholder="Skriv barens navn"
					value={typedName}
					maxLength={100}
					onChange={(event) => {
						const name = event.currentTarget.value;
						setTypedName(name);
						onChange(name.trim() ? { name, foursquareId: null } : null);
					}}
				/>

				{accessToken && (
					<Anchor
						component="button"
						type="button"
						size="sm"
						c="dimmed"
						mt={5}
						onClick={() => switchInput(false)}
					>
						Søg efter baren i stedet
					</Anchor>
				)}
			</Box>
		);
	}

	if (!accessToken) {
		return (
			<Text size="sm" c="dimmed" {...props}>
				Du skal være logget ind med Untappd for at søge efter barer.
			</Text>
		);
	}

	return (
		<Box {...props}>
			<VenueSearch
				label="Bar"
				placeholder="Søg efter baren"
				excludeVenueIds={EXCLUDED_VENUES}
				withinPortal
				onVenuesLoaded={(venues) => syncVenues(sessionId, venues)}
				isVenueDisabled={({ value, label }) =>
					!!findDuplicateBar(
						sessionBars,
						{ name: label, foursquareId: value },
						ignoreBarId,
					)
				}
				selectedVenue=""
				onChange={(foursquareId, name, details) =>
					onChange(name ? { name, foursquareId, ...details } : null)
				}
				untappdAccessToken={accessToken}
				lat={location.lat}
				lng={location.lng}
				priorityVenueIds={[]}
			/>

			{allowTyped && (
				<Anchor
					component="button"
					type="button"
					size="sm"
					c="dimmed"
					mt={5}
					onClick={() => switchInput(true)}
				>
					Kan du ikke finde baren? Skriv navnet i stedet
				</Anchor>
			)}
		</Box>
	);
}
