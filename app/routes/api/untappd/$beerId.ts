import * as cheerio from "cheerio";

import { createLink } from "~/utils/untappd";

import type { Route } from "./+types/$beerId";

export async function loader({ params }: Route.LoaderArgs) {
  const beerId = params.beerId;

  if (!beerId) {
    throw new Error("Beer ID is required");
  }

  const $ = await cheerio.fromURL(createLink(beerId));

  const iosUrl = $('meta[property="al:ios:url"]').attr("content");
  const idCheck = iosUrl?.replace("untappd://beer/", "");
  if (idCheck !== beerId) {
    throw new Error(`Provided beer ID: ${beerId}, but found: ${idCheck}`);
  }

  const name = $(".name h1").text().trim();
  const breweryName = $(".name .brewery a").text().trim();
  let breweryLink = $(".name .brewery a").attr("href");
  if (breweryLink) {
    breweryLink = `https://untappd.com${breweryLink}`;
  }
  const style = $(".name .style").text().trim();
  const label = $(".label.image-big").attr("data-image");
  const abvElement = $(".abv").text().trim();
  const abv = Number(abvElement.replace("% ABV", ""));

  const rating = $(".details .caps").attr("data-rating");
  const ratingsCountElement = $(".raters").text().trim();
  const ratingsCount = ratingsCountElement?.replace(" Ratings", "").trim();

  const checkinCount = $(".stats p:first-child .count").text().trim();
  const checkinCountUnique = $(".stats p:nth-child(2) .count").text().trim();

  const description = $(".beer-descrption-read-less")
    .contents()
    .filter((_, el) => el.type === "text")
    .text()
    .trim();

  return {
    id: Number(beerId),
    name,
    brewery: {
      name: breweryName,
      link: breweryLink,
    },
    style,
    label,
    abv,
    description,
    checkins: {
      total: Number(checkinCount),
      unique: Number(checkinCountUnique),
    },
    rating: {
      value: Number(rating),
      count: Number(ratingsCount),
    },
  };
}
