import { AppShell, Container, Grid } from "@mantine/core";
import { Outlet } from "react-router";

export default function Layout() {
	return (
		<AppShell>
			<AppShell.Main>
				<Container size="xs">
					<Grid justify="center" pt="md">
						<Grid.Col>
							<Outlet />
						</Grid.Col>
					</Grid>
				</Container>
			</AppShell.Main>
		</AppShell>
	);
}
