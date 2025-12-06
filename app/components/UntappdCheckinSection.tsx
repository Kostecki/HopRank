import {
	Box,
	Collapse,
	Divider,
	Grid,
	Stack,
	Switch,
	Text,
	Textarea,
} from "@mantine/core";

import type { Location } from "~/hooks/useGeolocation";
import { displayScore } from "~/utils/utils";

import VenueSearch from "./VenueSearch";

type UntappdCheckinSectionProps = {
	isEnabled: boolean;
	onEnabledChange: (value: boolean) => void;
	includeScore: boolean;
	onIncludeScoreChange: (value: boolean) => void;
	openInUntappd: boolean;
	onOpenInUntappdChange: (value: boolean) => void;
	isMobile: boolean;
	debouncedTotalScore: number;
	selectedVenue: string;
	onSelectedVenueChange: (value: string) => void;
	comment: string;
	onCommentChange: (value: string) => void;
	accessToken: string;
	location: Location;
};

export function UntappdCheckinSection({
	isEnabled,
	onEnabledChange,
	includeScore,
	onIncludeScoreChange,
	openInUntappd,
	onOpenInUntappdChange,
	isMobile,
	debouncedTotalScore,
	selectedVenue,
	onSelectedVenueChange,
	comment,
	onCommentChange,
	accessToken,
	location,
}: UntappdCheckinSectionProps) {
	return (
		<Box mb="lg">
			<Grid align="center" gutter="xs">
				<Grid.Col span={10}>
					<Stack gap="xs">
						<Switch
							label="Check-in i Untappd"
							color="slateIndigo"
							checked={isEnabled}
							onChange={(event) => onEnabledChange(event.currentTarget.checked)}
						/>
						<Text c="dimmed" size="xs">
							Lav et check-in direkte i Untappd sammen med din bedømmelse
						</Text>
					</Stack>
				</Grid.Col>
				<Grid.Col span={2}>
					<Text size="xl" ta="center">
						{displayScore(debouncedTotalScore, 1, 2)}
					</Text>
					<Text c="dimmed" fs="italic" ta="center" size="sm" mt={-5}>
						Score
					</Text>
				</Grid.Col>
			</Grid>

			<Collapse in={isEnabled}>
				<Divider my="lg" opacity={0.5} />

				<Grid align="flex-start" gutter="xs" my="lg">
					<Grid.Col
						span={{ base: 12, sm: isMobile ? 5 : 12 }}
						mb={{ base: "xs", sm: 0 }}
					>
						<Stack gap="xs">
							<Switch
								label="Bruge score"
								color="slateIndigo"
								checked={includeScore}
								onChange={(event) =>
									onIncludeScoreChange(event.currentTarget.checked)
								}
							/>
							<Text c="dimmed" size="xs">
								Brug den samlede score som rating i dit Untappd check-in
							</Text>
						</Stack>
					</Grid.Col>
					{isMobile && (
						<Grid.Col span={{ base: 12, sm: 7 }}>
							<Stack gap="xs">
								<Switch
									label="Åben i Untappd"
									color="slateIndigo"
									checked={openInUntappd}
									onChange={(event) =>
										onOpenInUntappdChange(event.currentTarget.checked)
									}
								/>
								<Text c="dimmed" size="xs">
									Åbner automatisk dit nye check-in i Untappd-appen efter
									bedømmelsen er gemt
								</Text>
							</Stack>
						</Grid.Col>
					)}
				</Grid>

				<VenueSearch
					mt="sm"
					selectedVenue={selectedVenue}
					onChange={onSelectedVenueChange}
					untappdAccessToken={accessToken}
					lat={location.lat}
					lng={location.lng}
					priorityVenueIds={[]}
				/>
				<Textarea
					mt="sm"
					label="Kommentar"
					rows={3}
					value={comment}
					onChange={(event) => onCommentChange(event.currentTarget.value)}
				/>
			</Collapse>
		</Box>
	);
}
