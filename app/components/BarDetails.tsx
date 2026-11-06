import {
	Button,
	Divider,
	Group,
	Paper,
	SimpleGrid,
	Stack,
	Text,
} from "@mantine/core";

import type { RankedBar } from "~/types/oneBeer";
import type { SessionProgress } from "~/types/session";
import type { SessionUser } from "~/types/user";

import { formatBarAddress, getBarMapUrl } from "~/utils/oneBeerRanking";
import { displayScore } from "~/utils/utils";

import BarActions from "./BarActions";

type InputProps = {
	user: SessionUser;
	session: SessionProgress;
	bar: RankedBar;
	// Where the viewer has this bar on their own ranking, if anywhere.
	position?: number;
};

function Detail({ label, value }: { label: string; value: string | number }) {
	return (
		<Stack gap={0} align="center">
			<Text fw={400} ta="center">
				{label}
			</Text>
			<Text fw="bold" ta="center">
				{value}
			</Text>
		</Stack>
	);
}

export default function BarDetails({
	user,
	session,
	bar,
	position,
}: InputProps) {
	const address = formatBarAddress(bar);
	const mapUrl = getBarMapUrl(bar);

	return (
		<Paper withBorder radius="md" p="md" pt="lg" mt={-10}>
			<SimpleGrid cols={3}>
				<Detail label="Din placering" value={position ?? "-"} />
				<Detail label="Gennemsnit" value={displayScore(bar.averagePosition)} />
				<Detail label="Stop #" value={bar.stopNumber} />
			</SimpleGrid>

			{(address || bar.category || mapUrl) && (
				<>
					<Divider opacity={0.3} my="md" />

					{(address || bar.category) && (
						<Group justify="center" gap="xs" wrap="nowrap">
							<Stack gap={0} align="center">
								{bar.category && <Text fw="bold">{bar.category}</Text>}
								{address && <Text ta="center">{address}</Text>}
							</Stack>
						</Group>
					)}

					{mapUrl && (
						<Button
							variant="light"
							component="a"
							href={mapUrl}
							target="_blank"
							color="slateIndigo"
							fullWidth
							mt="md"
						>
							Åben i kort
						</Button>
					)}
				</>
			)}

			<BarActions user={user} session={session} bar={bar} />
		</Paper>
	);
}
