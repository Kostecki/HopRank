import * as cheerio from "cheerio";

import { createBeerLink } from "~/utils/untappd";

import type { ScrapedBeer } from "~/types/untappd";
import type { Route } from "./+types/$beerId";

const cachedData = new Map<string, { data: ScrapedBeer; timestamp: number }>();
const inFlight = new Map<string, Promise<ScrapedBeer>>();
const maxAgeMs = 5 * 60 * 1000; // 5 minutes

function purgeExpiredCache() {
  const now = Date.now();
  for (const [key, value] of cachedData.entries()) {
    if (now - value.timestamp > maxAgeMs) {
      cachedData.delete(key);
    }
  }
}

export async function loader({ params }: Route.LoaderArgs) {
  const beerId = params.beerId;
  if (!beerId) throw new Error("Beer ID is required");

  purgeExpiredCache();

  const cached = cachedData.get(beerId);
  const now = Date.now();

  if (cached && now - cached.timestamp < maxAgeMs) {
    return cached.data;
  }

  // If there's already a fetch happening, wait for it
  const inflightFetch = inFlight.get(beerId);
  if (inflightFetch) {
    return inflightFetch;
  }

  // Otherwise, start a new fetch
  const fetchPromise = (async () => {
    const res = await fetch(createBeerLink(beerId));
    if (!res.ok) {
      throw new Error(
        `Failed to fetch beer page: ${res.status} ${res.statusText}`
      );
    }
    const html = await res.text();
    const $ = cheerio.load(html);

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
    const ratingsCount = ratingsCountElement
      ?.trim()
      .replace(" Ratings", "")
      .replace(",", "");

    const checkinCount = $(".stats p:first-child .count")
      .text()
      .trim()
      .replace(",", "");

    const checkinCountUnique = $(".stats p:nth-child(2) .count")
      .text()
      .trim()
      .replace(",", "");

    const description = $(".beer-descrption-read-less")
      .contents()
      .filter((_, el) => el.type === "text")
      .text()
      .trim();

    const outputData: ScrapedBeer = {
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
        total: checkinCount,
        unique: checkinCountUnique,
      },
      rating: {
        value: Number(rating),
        count: ratingsCount,
      },
    };

    cachedData.set(beerId, { data: outputData, timestamp: Date.now() });
    return outputData;
  })();

  // Save the promise in inFlight
  inFlight.set(beerId, fetchPromise);

  try {
    const result = await fetchPromise;
    return result;
  } finally {
    // Clean up after fetch finishes (whether success or failure)
    inFlight.delete(beerId);
  }
}
