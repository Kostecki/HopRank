import { Box } from "@mantine/core";
import { IconGripVertical } from "@tabler/icons-react";
import type { DragControls } from "motion/react";

// For anything that gets dragged: without it, a drag or a long press on a phone
// selects the text instead.
export const noTextSelection = {
	userSelect: "none",
	WebkitUserSelect: "none",
	WebkitTouchCallout: "none",
} as const;

type InputProps = {
	label: string;
	dragControls: DragControls;
	// A smaller, quieter handle for tight rows.
	compact?: boolean;
};

/**
 * Dragging starts from the handle only, so the rest of a row scrolls the page
 * normally on touch screens.
 */
export default function BarDragHandle({
	label,
	dragControls,
	compact = false,
}: InputProps) {
	return (
		<Box
			aria-label={label}
			px={compact ? 4 : "md"}
			py={4}
			onPointerDown={(event) => dragControls.start(event)}
			style={{
				cursor: "grab",
				flexShrink: 0,
				touchAction: "none",
				lineHeight: 0,
				...noTextSelection,
			}}
		>
			<IconGripVertical
				color={compact ? "#868e96" : "#484F65"}
				size={compact ? 16 : 22}
			/>
		</Box>
	);
}
