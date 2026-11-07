import { Button, Divider, Paper, Stack } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDebouncedValue } from "@mantine/hooks";
import { useEffect, useMemo, useRef } from "react";
import { useFetcher, useParams } from "react-router";

import type { Criterion, SessionProgress } from "~/types/session";
import type { SessionUser } from "~/types/user";

import { useFetcherResult } from "~/hooks/useFetcherResult";
import { useUntappdCheckin } from "~/hooks/useUntappdCheckin";
import { calculateVoteScore } from "~/utils/score";
import { sliderConf } from "~/utils/utils";

import RatingSlider from "./RatingSlider";
import SavedCard from "./SavedCard";
import { UntappdCheckinSection } from "./UntappdCheckinSection";

type InputProps = {
	user: SessionUser;
	session: SessionProgress;
	criteria: Criterion[];
};

export default function NewVote({ user, session, criteria }: InputProps) {
	const voteFetcher = useFetcher();
	const untappdFetcher = useFetcher();
	useFetcherResult(voteFetcher, {
		errorMessage: "Din stemme kunne ikke gemmes",
	});

	const { sessionId } = useParams();

	const previousBeerIdRef = useRef(session.currentBeer?.beerId ?? null);

	const { defaultValue } = sliderConf();

	const userHasRated =
		Object.keys(session.currentBeer?.userRatings ?? {}).length > 0;

	const initialFormValues = useMemo(
		() =>
			criteria.reduce(
				(acc, criterion) => {
					acc[criterion.name] =
						session.currentBeer?.userRatings?.[criterion.id] ?? defaultValue;
					return acc;
				},
				{} as Record<string, number>,
			),
		[criteria, defaultValue, session.currentBeer?.userRatings],
	);

	const ratingsForm = useForm({
		initialValues: initialFormValues,
	});

	const untappd = useUntappdCheckin({
		session,
		user,
		untappdFetcher,
	});

	const handleSubmit = (values: typeof ratingsForm.values) => {
		untappd.submitCheckin(calculatedTotalScore);

		const vote = {
			sessionId: Number(sessionId),
			userId: user.id,
			beerId: session.currentBeer?.beerId,
			ratings: Object.entries(values).map(([name, score]) => ({
				criterionId: criteria.find((r) => r.name === name)?.id,
				score,
			})),
		};

		const formData = new FormData();
		formData.append("vote", JSON.stringify(vote));

		voteFetcher.submit(formData, {
			method: "POST",
			action: `/api/sessions/${sessionId}/vote`,
		});
	};

	const calculatedTotalScore = useMemo(() => {
		return calculateVoteScore(ratingsForm.values, criteria);
	}, [ratingsForm.values, criteria]);
	const [debouncedTotalScore] = useDebouncedValue(calculatedTotalScore, 200);

	useEffect(() => {
		const currentBeerId = session.currentBeer?.beerId ?? null;
		if (currentBeerId === previousBeerIdRef.current) {
			return;
		}

		ratingsForm.setValues(initialFormValues);
		previousBeerIdRef.current = currentBeerId;
	}, [initialFormValues, ratingsForm, session.currentBeer?.beerId]);

	return (
		<Paper withBorder radius="md" p="md" pt="lg" mt={-10}>
			<form onSubmit={ratingsForm.onSubmit(handleSubmit)}>
				<Stack>
					{criteria.map((criterion) => (
						<RatingSlider
							key={criterion.id}
							form={ratingsForm}
							name={criterion.name}
							label={criterion.name}
						/>
					))}
				</Stack>

				<Divider my="lg" opacity={0.75} />

				{!userHasRated && user.untappd?.id && (
					<UntappdCheckinSection
						isEnabled={untappd.isEnabled}
						onEnabledChange={untappd.setIsEnabled}
						includeScore={untappd.includeScore}
						onIncludeScoreChange={untappd.setIncludeScore}
						openInUntappd={untappd.openInUntappd}
						onOpenInUntappdChange={untappd.setOpenInUntappd}
						isMobile={untappd.isMobile}
						debouncedTotalScore={debouncedTotalScore}
						selectedVenue={untappd.selectedVenue}
						onSelectedVenueChange={untappd.setSelectedVenue}
						comment={untappd.comment}
						onCommentChange={untappd.setComment}
						location={untappd.location}
					/>
				)}

				<Button
					color="slateIndigo"
					tt="uppercase"
					fw="bold"
					lts={0.8}
					fullWidth
					type="submit"
					loading={
						voteFetcher.state !== "idle" || untappdFetcher.state !== "idle"
					}
					mb="lg"
				>
					Gem Bedømmelse {untappd.isEnabled && "og Check-in"}
				</Button>

				{userHasRated && (
					<>
						<SavedCard
							title="Din bedømmelse er gemt!"
							description="Så længe der stadig bliver stemt kan du altid ændre din score ved at gemme bedømmelsen igen."
						/>

						{untappd.checkinId && (
							<SavedCard
								mt="md"
								title="Dit check-in er oprettet i Untappd!"
								description="Du kan finde det i appen, eller ved at trykke på linket herunder - så bliver du taget direkte til det."
							>
								<Button
									variant="default"
									color="slateIndigo"
									fullWidth
									mt="md"
									radius="md"
									onClick={untappd.openInApp}
								>
									Se check-in i Untappd
								</Button>
							</SavedCard>
						)}
					</>
				)}
			</form>
		</Paper>
	);
}
