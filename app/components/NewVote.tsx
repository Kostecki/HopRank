import {
	Avatar,
	Box,
	Button,
	Card,
	Collapse,
	Divider,
	Flex,
	Grid,
	Group,
	LoadingOverlay,
	Paper,
	Stack,
	Switch,
	Text,
	Textarea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDebouncedValue } from "@mantine/hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFetcher, useParams } from "react-router";
import RatingSlider from "./RatingSlider";
import VenueSearch from "./VenueSearch";

import { IconCheck } from "@tabler/icons-react";
import { useGeolocation } from "~/hooks/useGeolocation";
import type { SessionCriterion, SessionProgress } from "~/types/session";
import type { SessionUser } from "~/types/user";
import { calculateVoteScore } from "~/utils/score";
import { showDangerToast } from "~/utils/toasts";
import { getGmtOffset, isMobileOrTablet, sliderConf } from "~/utils/utils";

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

	const [isMobile, setIsMobile] = useState(false);
	const [enableUntappdCheckin, setEnableUntappdCheckin] = useState(false);
	const [openInUntappd, setOpenInUntappd] = useState(true);
	const [includeScore, setIncludeScore] = useState(true);

	const [selectedVenue, setSelectedVenue] = useState<string>("");
	const [comment, setComment] = useState<string>("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [checkinId, setCheckinId] = useState<number | null>(null);

	const hasRequestedLocation = useRef(false);

	const { defaultValue } = sliderConf();
	const { location, requestLocation } = useGeolocation();

	const userHasRated =
		Object.keys(session.currentBeer?.userRatings ?? {}).length > 0;

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

	const openInApp = () => {
		if (!checkinId) return;

		const checkinUrl = `untappd://checkin/${checkinId}`;
		window.open(checkinUrl, "_self");
	};

	const handleSubmit = async (values: typeof ratingsForm.values) => {
		setIsSubmitting(true);

		try {
			if (enableUntappdCheckin && user.untappd && session.currentBeer) {
				const geoLat = location.lat.toFixed(4);
				const geoLng = location.lng.toFixed(4);
				const gmtOffset = getGmtOffset().toString();

				const formDataUntappd = new FormData();
				formDataUntappd.append(
					"bid",
					session.currentBeer.untappdBeerId.toString(),
				);
				formDataUntappd.append("geolat", geoLat);
				formDataUntappd.append("geolng", geoLng);
				formDataUntappd.append("foursquare_id", selectedVenue);
				formDataUntappd.append("shout", comment);
				formDataUntappd.append("timezone", "Europe/Copenhagen");
				formDataUntappd.append("gmt_offset", gmtOffset);

				if (includeScore) {
					formDataUntappd.append("rating", calculatedTotalScore.toString());
				}

				const checkInResponse = await fetch("/api/untappd/check-in", {
					method: "POST",
					body: formDataUntappd,
				});

				const checkInData = await checkInResponse.json();

				if (checkInResponse.ok && checkInData.success) {
					setCheckinId(checkInData.data.checkinId);
					setEnableUntappdCheckin(false);
					setComment("");

					if (openInUntappd) {
						openInApp();
					}
				} else {
					showDangerToast("Untappd check-in fejlede");
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

			voteFetcher.submit(formData, {
				method: "POST",
				action: `/api/sessions/${sessionId}/vote`,
			});
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

	useEffect(() => {
		setIsMobile(isMobileOrTablet());
	}, []);

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

				{!userHasRated}
				{!userHasRated &&
					user.untappd?.id &&
					user.untappd.accessToken &&
					CHECKIN_ENABLED && (
						<Box mb="lg">
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
											Lav et check-in direkte i Untappd sammen med din
											bedømmelse
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
								<Divider my="lg" opacity={0.5} />

								<Grid align="flex-start" gutter="xs" my="lg">
									<Grid.Col
										span={{ base: 12, sm: 5 }}
										mb={{ base: "xs", sm: 0 }}
									>
										<Stack gap="xs">
											<Switch
												label="Bruge score"
												color="slateIndigo"
												checked={includeScore}
												onChange={(event) =>
													setIncludeScore(event.currentTarget.checked)
												}
											/>
											<Text c="dimmed" size="xs">
												Brug den samlede score som rating i dit Untappd check-in
											</Text>
										</Stack>
									</Grid.Col>
									<Grid.Col span={{ base: 12, sm: 7 }}>
										<Stack gap="xs">
											<Switch
												label="Åben i Untappd"
												color="slateIndigo"
												checked={openInUntappd}
												onChange={(event) =>
													setOpenInUntappd(event.currentTarget.checked)
												}
												disabled={!isMobile}
											/>
											<Text c="dimmed" size="xs">
												Åbner automatisk dit nye check-in i Untappd-appen efter
												bedømmelsen er gemt
											</Text>
										</Stack>
									</Grid.Col>
								</Grid>

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
						</Box>
					)}

				<Button
					color="slateIndigo"
					tt="uppercase"
					fw="bold"
					lts={0.8}
					fullWidth
					type="submit"
					loading={isSubmitting || voteFetcher.state !== "idle"}
					mb="lg"
				>
					Gem Bedømmelse {enableUntappdCheckin && "og Check-in"}
				</Button>

				{userHasRated && (
					<>
						<Card shadow="xs" radius="md">
							<LoadingOverlay
								visible={isSubmitting || voteFetcher.state !== "idle"}
								zIndex={1000}
								overlayProps={{ radius: "sm", blur: 2 }}
								loaderProps={{ color: "slateIndigo" }}
							/>
							<Flex align="center">
								<Avatar
									color="slateIndigo"
									variant="outline"
									size="lg"
									radius="xl"
								>
									<IconCheck color="#484F65" size={30} />
								</Avatar>

								<Group ml="xl" gap={3}>
									<Text>Din bedømmelse er gemt!</Text>
									<Text size="sm" c="dimmed">
										Så længe der stadig bliver stemt kan du altid ændre din
										score ved at gemme bedømmelsen igen.
									</Text>
								</Group>
							</Flex>
						</Card>

						{checkinId && (
							<Card shadow="xs" radius="md" mt="md">
								<Flex align="center">
									<Avatar
										color="slateIndigo"
										variant="outline"
										size="lg"
										radius="xl"
									>
										<IconCheck color="#484F65" size={30} />
									</Avatar>

									<Group ml="xl" gap={3}>
										<Text>Dit check-in er oprettet i Untappd!</Text>
										<Text size="sm" c="dimmed">
											Du kan finde det i appen, eller ved at trykke på linket
											herunder - så bliver du taget direkte til det.
										</Text>
									</Group>
								</Flex>

								<Button
									variant="default"
									color="slateIndigo"
									fullWidth
									mt="md"
									radius="md"
								>
									Se check-in i Untappd
								</Button>
							</Card>
						)}
					</>
				)}
			</form>
		</Paper>
	);
}
