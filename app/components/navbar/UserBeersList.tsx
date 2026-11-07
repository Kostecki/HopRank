import {
	ActionIcon,
	Anchor,
	Divider,
	Flex,
	Group,
	List,
	Stack,
	Text,
} from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useFetcher } from "react-router";

import { SessionBeerStatus } from "~/types/session";

import type { SelectSessionBeersWithBeer } from "~/database/schema.types";
import { useFetcherResult } from "~/hooks/useFetcherResult";
import { createBeerLink } from "~/utils/untappd";

import BeerThumbnail from "../BeerThumbnail";
import { ModalAddBeersTrigger } from "../modals/ModalAddBeers";

function UserBeerRow({
	beer,
	onRemove,
}: {
	beer: SelectSessionBeersWithBeer;
	onRemove: (beerId: number) => void;
}) {
	const {
		beer: { id, name, breweryName, label, untappdBeerId },
	} = beer;

	const isDisabled =
		beer.status === SessionBeerStatus.rating ||
		beer.status === SessionBeerStatus.rated;

	const untappdLink = createBeerLink(untappdBeerId);

	return (
		<Flex justify="space-between" pos="relative">
			<Stack gap={0} mb="sm">
				<Anchor underline="never" href={untappdLink} target="_blank">
					<Group gap="xs" wrap="nowrap">
						<BeerThumbnail src={label} />
						<Stack gap={0}>
							<Text size="sm" fw="500" mr="xs" c="black">
								{name}
							</Text>
							<Text size="sm" c="dimmed">
								{breweryName}
							</Text>
						</Stack>
					</Group>
				</Anchor>
			</Stack>

			<ActionIcon
				variant="subtle"
				color="slateIndigo"
				onClick={() => onRemove(id)}
				disabled={isDisabled}
				aria-label="Fjern øl"
			>
				<IconTrash style={{ width: "70%", height: "70%" }} stroke={1.5} />
			</ActionIcon>
		</Flex>
	);
}

type UserBeersListProps = {
	sessionId: number;
	sessionBeers: SelectSessionBeersWithBeer[];
	viewerId: number | undefined;
};

/** The beers the viewer added, which they can remove until they're tasted. */
export function UserBeersList({
	sessionId,
	sessionBeers,
	viewerId,
}: UserBeersListProps) {
	const removeFetcher = useFetcher();

	useFetcherResult(removeFetcher, { errorMessage: "Øllen kunne ikke fjernes" });

	// Hidden while its removal is pending. The action revalidates the loaders,
	// so on success the beer is gone from the list by the time the fetcher is
	// idle, and on failure it simply shows again.
	const removingBeerId =
		removeFetcher.state !== "idle" && removeFetcher.formAction
			? Number(removeFetcher.formAction.split("/").pop())
			: null;

	const handleRemoveBeer = (beerId: number) => {
		removeFetcher.submit(null, {
			method: "POST",
			action: `/api/sessions/${sessionId}/remove/${beerId}`,
		});
	};

	// Sorted by the stable session_beers id (insertion order), not the
	// tasting-queue `order` field: that one is reshuffled whenever a waiting
	// beer is added or removed, which would make the viewer's own unrelated
	// beers visibly reorder in this list.
	const usersBeers = sessionBeers
		.filter(
			(beer) =>
				beer.addedByUserId === viewerId && beer.beerId !== removingBeerId,
		)
		.sort((a, b) => b.id - a.id);

	return (
		<>
			<Group mt="xl" justify="space-between">
				<Text size="md" tt="uppercase">
					Dine øl
				</Text>

				<ModalAddBeersTrigger>
					<ActionIcon
						variant="subtle"
						color="slateIndigo"
						aria-label="Tilføj øl"
					>
						<IconPlus size={14} />
					</ActionIcon>
				</ModalAddBeersTrigger>
			</Group>

			<Divider opacity={0.5} mb="md" />

			{usersBeers.length > 0 ? (
				<List spacing="xs" size="sm" pl={0}>
					{usersBeers.map((beer) => (
						<UserBeerRow
							key={beer.beerId}
							beer={beer}
							onRemove={handleRemoveBeer}
						/>
					))}
				</List>
			) : (
				<Text c="dimmed" fs="italic" ta="center">
					Der er ikke tilføjet nogle øl
				</Text>
			)}
		</>
	);
}
