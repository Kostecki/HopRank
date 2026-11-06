import { Box, type BoxProps } from "@mantine/core";
import type { ReactNode } from "react";

type InputProps = {
	children: ReactNode;
} & BoxProps;

/**
 * A full-width block on the results page. It has no side padding of its own, so
 * it lines up with the podium inside the page's padding.
 */
export default function ResultsSection({ children, ...props }: InputProps) {
	return (
		<Box mt="xl" {...props}>
			{children}
		</Box>
	);
}
