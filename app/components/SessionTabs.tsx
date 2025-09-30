import { Tabs } from "@mantine/core";
import SessionsTable, { type Session } from "./SessionsTable";

type InputProps = {
	activeSessions: Session[];
	finishedSessions: Session[];
	readOnly: boolean;
};

export function SessionTabs({
	activeSessions,
	finishedSessions,
	readOnly,
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
				<SessionsTable
					sessions={activeSessions}
					mode="active"
					readOnly={readOnly}
				/>
			</Tabs.Panel>

			<Tabs.Panel value="finished">
				<SessionsTable
					sessions={finishedSessions}
					mode="finished"
					readOnly={readOnly}
				/>
			</Tabs.Panel>
		</Tabs>
	);
}
