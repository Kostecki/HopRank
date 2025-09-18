import {
	Button,
	Card,
	Divider,
	Flex,
	Image,
	Paper,
	TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconAt } from "@tabler/icons-react";
import { useState } from "react";
import { Link, useFetcher } from "react-router";

import styles from "./styles.module.css";

export default function LoginForm() {
	const [isRotating, setIsRotating] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const fetcher = useFetcher();
	const isSubmitting = fetcher.state !== "idle" || fetcher.formData != null;

	const handleClick = () => {
		setIsRotating(true);

		setTimeout(() => {
			setIsRotating(false);
		}, 1500);
	};

	const form = useForm({
		mode: "uncontrolled",
		initialValues: {
			email: "",
		},
	});

	const handleSubmit = ({ email }: typeof form.values) => {
		const formData = new FormData();
		formData.append("email", email);

		fetcher.submit(formData, {
			method: "POST",
			action: "/auth/login",
		});
	};

	return (
		<Card shadow="lg" padding="lg" radius="md">
			<Card.Section p="xl">
				<Flex justify="center" align="center" direction="column">
					<Paper
						radius="100"
						shadow="sm"
						onClick={handleClick}
						className={isRotating ? styles.rotate : ""}
						style={{ cursor: "pointer" }}
					>
						<Image src="/logo.png" height="auto" w={150} fit="contain" m="lg" />
					</Paper>
				</Flex>
			</Card.Section>

			<Button
				component={Link}
				to="/auth/untappd"
				color="untappd"
				fullWidth
				loading={isLoading}
				onClick={() => setIsLoading(true)}
			>
				Log ind med Untappd
			</Button>

			<Divider opacity={0.4} my="md" label="Eller" labelPosition="center" />

			<form onSubmit={form.onSubmit(handleSubmit)}>
				<TextInput
					placeholder="Indtast din email"
					leftSection={<IconAt size={16} />}
					leftSectionPointerEvents="none"
					required
					name="email"
					type="email"
					autoComplete="email"
					key={form.key("email")}
					{...form.getInputProps("email")}
				/>

				<Button
					type="submit"
					color="slateIndigo"
					fullWidth
					mt="xs"
					loading={isSubmitting}
				>
					Log ind med email
				</Button>
			</form>

			{/* <a href="untappd://checkin/1356616394">Check-in</a> */}
		</Card>
	);
}
