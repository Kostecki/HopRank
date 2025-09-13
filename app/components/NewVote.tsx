import {
	Button,
	Center,
	Collapse,
	Divider,
	Grid,
	Image,
	Paper,
	ScrollArea,
	SegmentedControl,
	Stack,
	Switch,
	Text,
	Textarea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDebouncedValue } from "@mantine/hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFetcher, useParams } from "react-router";

import FriendsSearch from "./FriendsSearch";
import RatingSlider from "./RatingSlider";
import VenueSearch from "./VenueSearch";

import { useGeolocation } from "~/hooks/useGeolocation";

import servingStyles from "~/servingStyles.json";
import { calculateVoteScore } from "~/utils/score";
import { getGmtOffset, sliderConf } from "~/utils/utils";

import type { SessionCriterion, SessionProgress } from "~/types/session";
import type { SessionUser } from "~/types/user";
import { showDangerToast, showSuccessToast } from "~/utils/toasts";

const CHECKIN_ENABLED = Boolean(
	JSON.parse(import.meta.env.VITE_UNTAPPD_CHECKIN),
);

type InputProps = {
	user: SessionUser;
	session: SessionProgress;
	sessionCriteria: SessionCriterion[];
};

export default function NewVote({
	user,
	session,
	sessionCriteria,
}: InputProps) {
	const voteFetcher = useFetcher();

	const { sessionId } = useParams();

	const [enableUntappdCheckin, setEnableUntappdCheckin] = useState(false);
	const [selectedServingStyle, setSelectedServingStyle] = useState("1");
	const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
	const [selectedVenue, setSelectedVenue] = useState<string>("");
	const [comment, setComment] = useState<string>("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const hasRequestedLocation = useRef(false);

	const { defaultValue } = sliderConf();

	const { location, requestLocation } = useGeolocation();

	const participantsUntappdIds = session?.users
		.map((user) => user.untappdId)
		.filter((id): id is number => id !== undefined);

	const ratingsForm = useForm({
		initialValues: sessionCriteria.reduce(
			(acc, key) => {
				acc[key.name] =
					session.currentBeer?.userRatings?.[key.id] ?? defaultValue;
				return acc;
			},
			{} as Record<string, number>,
		),
	});

	const handleSubmit = async (values: typeof ratingsForm.values) => {
		setIsSubmitting(true);

		try {
			if (enableUntappdCheckin && user.untappd && session.currentBeer) {
				const geoLat = Number(location.lat.toFixed(4));
				const geoLng = Number(location.lng.toFixed(4));

				const checkin = {
					beerId: session.currentBeer.untappdBeerId,
					rating: calculatedTotalScore,
					geoLat,
					geoLng,
					friends: selectedFriends.join(","),
					venueId: selectedVenue,
					comment,
					containerId: Number.parseInt(selectedServingStyle),
					timezone: "Europe/Copenhagen",
					gmtOffset: getGmtOffset(),
				};

				const formDataUntappd = new FormData();
				formDataUntappd.append("bid", checkin.beerId.toString());
				formDataUntappd.append("rating", checkin.rating.toString());
				formDataUntappd.append("geolat", checkin.geoLat.toString());
				formDataUntappd.append("geolng", checkin.geoLng.toString());
				formDataUntappd.append("checkin_tags", checkin.friends);
				formDataUntappd.append("foursquare_id", checkin.venueId);
				formDataUntappd.append("timezone", checkin.timezone);
				formDataUntappd.append("container_id", checkin.containerId.toString());
				formDataUntappd.append("gmt_offset", checkin.gmtOffset.toString());
				formDataUntappd.append("shout", checkin.comment);

				const checkInResponse = await fetch("/api/untappd/check-in", {
					method: "POST",
					body: formDataUntappd,
				});

				const checkInData = await checkInResponse.json();

				if (checkInResponse.ok && checkInData.success) {
					showSuccessToast("Check-in successful!");

					// Reset states
					setSelectedServingStyle("1");
					setComment("");
				} else {
					showDangerToast(checkInData.message, "Check-in failed");
				}
			}

			const vote = {
				sessionId: Number(sessionId),
				userId: user.id,
				beerId: session.currentBeer?.beerId,
				untappdBeerId: session.currentBeer?.untappdBeerId,
				ratings: Object.entries(values).map(([name, rating]) => ({
					id: sessionCriteria.find((r) => r.name === name)?.id,
					name,
					rating,
				})),
			};

			const formData = new FormData();
			formData.append("vote", JSON.stringify(vote));

			// voteFetcher.submit(formData, {
			// 	method: "POST",
			// 	action: `/api/sessions/${sessionId}/vote`,
			// });
		} finally {
			setIsSubmitting(false);
		}
	};

	const calculatedTotalScore = useMemo(() => {
		return calculateVoteScore(ratingsForm.values, sessionCriteria);
	}, [ratingsForm.values, sessionCriteria]);
	const [debouncedTotalScore] = useDebouncedValue(calculatedTotalScore, 200);

	useEffect(() => {
		if (enableUntappdCheckin && !hasRequestedLocation.current) {
			requestLocation();
			hasRequestedLocation.current = true;
		} else if (!enableUntappdCheckin) {
			hasRequestedLocation.current = false;
		}
	}, [enableUntappdCheckin, requestLocation]);

	return (
		<Paper withBorder radius="md" p="md" pt="lg" mt={-10}>
			<form onSubmit={ratingsForm.onSubmit(handleSubmit)}>
				<Stack>
					{sessionCriteria.map((criterion) => (
						<RatingSlider
							key={criterion.id}
							form={ratingsForm}
							name={criterion.name}
							label={criterion.name}
						/>
					))}
				</Stack>

				<Divider my="lg" opacity={0.75} />

				{user.untappd?.id && user.untappd.accessToken && CHECKIN_ENABLED && (
					<>
						<Grid align="center" gutter="xs">
							<Grid.Col span={10}>
								<Stack gap="xs">
									<Switch
										label="Check-in i Untappd"
										color="slateIndigo"
										checked={enableUntappdCheckin}
										onChange={(event) => {
											setEnableUntappdCheckin(event.currentTarget.checked);
										}}
									/>
									<Text c="dimmed" size="xs">
										Lav et check-in direkte i Untappd sammen med din bedømmelse
									</Text>
								</Stack>
							</Grid.Col>
							<Grid.Col span={2}>
								<Text size="xl" ta="center">
									{Number.isNaN(debouncedTotalScore)
										? "0.00"
										: debouncedTotalScore}
								</Text>
								<Text c="dimmed" fs="italic" ta="center" size="sm" mt={-5}>
									Score
								</Text>
							</Grid.Col>
						</Grid>

						<Collapse in={enableUntappdCheckin}>
							<ScrollArea type="never" offsetScrollbars scrollbarSize={4}>
								<SegmentedControl
									mt="lg"
									value={selectedServingStyle}
									onChange={setSelectedServingStyle}
									data={servingStyles.map((style) => ({
										value: style.container_id.toString(),
										label: (
											<Center style={{ gap: 5 }}>
												<Image
													src={style.container_image_url}
													alt={style.container_name}
													width={20}
													height={20}
													ml="xs"
												/>
												<Text size="sm" mr="md">
													{style.container_name_dk}
												</Text>
											</Center>
										),
									}))}
								/>
							</ScrollArea>

							<FriendsSearch
								mt="sm"
								value={selectedFriends}
								onChange={setSelectedFriends}
								untappdAccessToken={user.untappd.accessToken}
								priorityUserIds={participantsUntappdIds}
							/>

							<VenueSearch
								mt="sm"
								selectedVenue={selectedVenue}
								onChange={setSelectedVenue}
								untappdAccessToken={user.untappd.accessToken}
								lat={location.lat}
								lng={location.lng}
								priorityVenueIds={[]}
							/>

							<Textarea
								mt="sm"
								label="Kommentar"
								rows={3}
								value={comment}
								onChange={(event) => setComment(event.currentTarget.value)}
							/>
						</Collapse>
					</>
				)}

				<Button
					color="slateIndigo"
					tt="uppercase"
					fw="bold"
					lts={0.8}
					fullWidth
					type="submit"
					loading={isSubmitting || voteFetcher.state !== "idle"}
					mt="lg"
				>
					Gem Bedømmelse {enableUntappdCheckin && "og Check-in"}
				</Button>
			</form>
		</Paper>
	);
}
