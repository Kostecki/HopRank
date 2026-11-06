import { Avatar, Card, type CardProps, Flex, Group, Text } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import type { ReactNode } from "react";

type InputProps = {
	title: string;
	description: string;
	children?: ReactNode;
} & CardProps;

export default function SavedCard({
	title,
	description,
	children,
	...props
}: InputProps) {
	return (
		<Card shadow="xs" radius="md" {...props}>
			<Flex align="center">
				<Avatar color="slateIndigo" variant="outline" size="lg" radius="xl">
					<IconCheck color="#484F65" size={30} />
				</Avatar>

				<Group ml="xl" gap={3}>
					<Text>{title}</Text>
					<Text size="sm" c="dimmed">
						{description}
					</Text>
				</Group>
			</Flex>

			{children}
		</Card>
	);
}
