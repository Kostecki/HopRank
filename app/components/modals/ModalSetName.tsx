import { Button, Modal, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";

import type { SessionUser } from "~/types/user";

import { showDangerToast, showSuccessToast } from "~/utils/toasts";

type InputProps = {
	user: SessionUser;
};

export function ModalSetName({ user }: InputProps) {
	const [opened, { open, close }] = useDisclosure(false);
	const fetcher = useFetcher();
	const form = useForm({ initialValues: { name: "" } });

	const [handled, setHandled] = useState(false);

	useEffect(() => {
		if (!user?.untappd && (!user?.name || user.name.trim() === "")) {
			setTimeout(() => open(), 100);
		}
	}, [user.name, user?.untappd, open]);

	useEffect(() => {
		if (fetcher.state === "idle" && fetcher.data && !handled) {
			const { status, message } = fetcher.data;

			if (status === 200) {
				showSuccessToast(message || "Dit navn er blevet opdateret!");
				form.reset();
				close();
			} else {
				showDangerToast(
					message || "Der opstod en fejl ved opdatering af dit navn.",
				);
			}

			setHandled(true);
		}

		if (fetcher.state === "submitting") {
			setHandled(false);
		}
	}, [fetcher.state, fetcher.data, handled, form, close]);

	const handleSubmit = (values: typeof form.values) => {
		const formData = new FormData();
		formData.append("name", values.name.trim());
		fetcher.submit(formData, { method: "post", action: "/api/user/update" });
	};

	return (
		<Modal opened={opened} onClose={close} title="Velkommen til HopRank!">
			<form onSubmit={form.onSubmit(handleSubmit)}>
				<TextInput
					label="Indtast dit navn"
					placeholder="Jacob Christian Jacobsen"
					required
					{...form.getInputProps("name")}
				/>
				<Button
					type="submit"
					mt="md"
					loading={fetcher.state !== "idle"}
					fullWidth
					color="slateIndigo"
				>
					Gem
				</Button>
			</form>
		</Modal>
	);
}
