import { Anchor } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import type { SelectBeers } from "~/database/schema.types";
import { createBeerLink } from "~/utils/untappd";

import { RankCard } from "./RankCard";

type InputProps = {
	beer: SelectBeers;
};

/** The beer the whole smagning is about. The card links to it on Untappd. */
export default function BeerHeader({ beer }: InputProps) {
	return (
		<Anchor
			display="block"
			href={createBeerLink(beer.untappdBeerId)}
			target="_blank"
			underline="never"
			c="inherit"
			mb="md"
			aria-label={`Åben ${beer.name} i Untappd`}
		>
			<RankCard
				image={beer.label}
				title={beer.name}
				subtitle={beer.breweryName}
				detail={beer.style}
				aside={<IconExternalLink color="#484F65" size={20} stroke={1.5} />}
			/>
		</Anchor>
	);
}
