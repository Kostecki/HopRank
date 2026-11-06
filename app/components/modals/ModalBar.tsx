import { Button, Modal, Stack } from "@mantine/core";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";

import type { BarSelection, SessionBar } from "~/types/oneBeer";
import type { SessionUser } from "~/types/user";

import { showDangerToast, showSuccessToast } from "~/utils/toasts";

import AddBarForm from "../AddBarForm";
import BarPicker from "../BarPicker";

type ModalProps = {
	opened: boolean;
	onClose: () => void;
	user: SessionUser;
	sessionId: number;
};

export function ModalAddBar({
	opened,
	onClose,
	user,
	sessionId,
	onAdded,
}: ModalProps & { onAdded?: () => void }) {
	return (
		<Modal.Root opened={opened} onClose={onClose}>
			<Modal.Overlay />
			<Modal.Content>
				<Modal.Header>
					<Modal.Title fw="500">Udvid smagningen</Modal.Title>
					<Modal.CloseButton />
				</Modal.Header>
				<Modal.Body>
					<AddBarForm
						user={user}
						sessionId={sessionId}
						onAdded={() => {
							showSuccessToast("Bar tilføjet til smagningen");
							onClose();
							onAdded?.();
						}}
					/>
				</Modal.Body>
			</Modal.Content>
		</Modal.Root>
	);
}

export function ModalCorrectBar({
	opened,
	onClose,
	user,
	sessionId,
	bar,
}: ModalProps & { bar: SessionBar }) {
	const [selection, setSelection] = useState<BarSelection | null>(null);

	const fetcher = useFetcher();

	const handleSubmit = () => {
		if (!selection) return;

		const formData = new FormData();
		formData.append("bar", JSON.stringify(selection));

		fetcher.submit(formData, {
			method: "PATCH",
			action: `/api/sessions/${sessionId}/bars/${bar.id}`,
		});
	};

	const { data, state } = fetcher;

	useEffect(() => {
		if (state !== "idle" || !data) return;

		const result = data as { success?: boolean; message?: string };
		const fetcherWithReset = fetcher as typeof fetcher & {
			reset?: () => void;
		};

		if (result.success) {
			showSuccessToast("Baren er rettet");
			onClose();
		} else {
			showDangerToast(result.message ?? "Kunne ikke rette baren");
		}

		fetcherWithReset.reset?.();
	}, [state, data, fetcher, onClose]);

	return (
		<Modal.Root opened={opened} onClose={onClose}>
			<Modal.Overlay />
			<Modal.Content>
				<Modal.Header>
					<Modal.Title fw="500">Ret {bar.name}</Modal.Title>
					<Modal.CloseButton />
				</Modal.Header>
				<Modal.Body>
					<Stack mt="xs">
						<BarPicker
							user={user}
							sessionId={sessionId}
							ignoreBarId={bar.id}
							onChange={setSelection}
							allowTyped={false}
						/>

						<Button
							color="slateIndigo"
							fullWidth
							radius="md"
							onClick={handleSubmit}
							disabled={!selection}
							loading={state !== "idle"}
						>
							Ret baren
						</Button>
					</Stack>
				</Modal.Body>
			</Modal.Content>
		</Modal.Root>
	);
}
