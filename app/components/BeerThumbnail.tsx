import { Image } from "@mantine/core";

type InputProps = {
	src: string;
};

/** The beer's label at list size. Decorative: the name is always next to it. */
export default function BeerThumbnail({ src }: InputProps) {
	return (
		<Image
			src={src}
			alt=""
			radius="sm"
			h={32}
			w={32}
			fit="contain"
			flex="0 0 32px"
		/>
	);
}
