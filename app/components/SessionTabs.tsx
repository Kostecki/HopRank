import { Tabs } from "@mantine/core";

import SessionsTable, { type Session } from "./SessionsTable";

type InputProps = {
	inProgressSessions: Session[];
	finishedSessions: Session[];
};

export function SessionTabs({
	inProgressSessions,
	finishedSessions,
}: InputProps) {
	return (
		<Tabs defaultValue="active" color="slateIndigo">
			<Tabs.List mb="sm" grow justify="center">
				<Tabs.Tab value="active" fw="bold">
					Aktive
				</Tabs.Tab>
				<Tabs.Tab value="finished" fw="bold">
					Afsluttede
				</Tabs.Tab>
			</Tabs.List>

			<Tabs.Panel value="active">
				<SessionsTable sessions={inProgressSessions} mode="active" />
			</Tabs.Panel>

			<Tabs.Panel value="finished">
				<SessionsTable sessions={finishedSessions} mode="finished" />
			</Tabs.Panel>
		</Tabs>
	);
}
