import { data } from "react-router";

import type { SliderConfig } from "~/types/rating";

/**
 * Generates the configuration for the slider component.
 *
 * @returns Configuration object SliderConfig containing:
 * - `stepSize`: The increment step for the slider values.
 * - `max`: The maximum value allowed by the slider.
 * - `defaultValue`: The default slider value (closest to half of the max).
 * - `marks`: An array of marks to display on the slider, each with a `value` key.
 */
export const sliderConf = (): SliderConfig => {
  const stepSize = 0.25;
  const max = 5;

  // Valid values from stepSize to max
  const stepsCount = Math.floor(max / stepSize);
  const steps = Array.from(
    { length: stepsCount },
    (_, i) => (i + 1) * stepSize
  );

  // Choose middle value as closest to max / 2, while still a valid step
  const half = max / 2;
  const defaultValue = steps.reduce((closest, current) => {
    const diff = Math.abs(current - half);
    const closestDiff = Math.abs(closest - half);

    if (diff < closestDiff) return current;
    if (diff === closestDiff) return Math.max(current, closest);
    return closest;
  });

  const marks = steps.map((step) => ({ value: step }));

  return { stepSize, max, defaultValue, marks };
};

/**
 * Creates a consistent page title in the format "Page - HopRank".
 *
 * @param pageTitle - The specific page's title.
 * @returns The formatted full page title string.
 */
export const getPageTitle = (pageTitle: string): string =>
  `${pageTitle} - HopRank`;

/**
 * A utility that returns a promise which resolves after a specified delay.
 *
 * @param ms - The number of milliseconds to wait.
 * @returns A promise that resolves after the delay.
 */
export const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

/**
 * Formats a numeric score for display, using a comma as the decimal separator.
 * If the score is undefined, returns a dash ("-").
 *
 * @param score - The score to format (e.g., 3.75).
 * @returns {string} The formatted score (e.g., "3,75") or "-" if undefined.
 */
export const displayScore = (score: number | undefined): string => {
  if (score === undefined) return "-";
  return score.toFixed(2).replace(".", ",");
};

/**
 * Extracts and validates a numeric session ID from a string input.
 * Throws a 400 response if the input is missing or not a valid number.
 *
 * @param inputParam - The input string to parse as a session ID.
 * @returns The parsed session ID as a number.
 * @throws A 400 Remix response if the input is invalid.
 */
export const extractSessionId = (inputParam: string) => {
  const sessionId = Number(inputParam);

  if (!inputParam || Number.isNaN(sessionId)) {
    throw data({ message: "Invalid session ID" }, { status: 400 });
  }

  return sessionId;
};

/**
 * Generates a random join code consisting of 5 alphanumeric characters.
 * The code is composed of uppercase letters (A-Z) and digits (0-9).
 *
 * @returns A randomly generated join code.
 */
export const generateJoinCode = () => {
  const characters = "ABCDEFGHJKLMNOPQRSTUVWXYZ0123456789";
  const length = 5;

  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return result;
};

/**
 * Calculates the GMT offset in hours for the current timezone.
 *
 * @return {number} The GMT offset in hours (e.g., -5 for GMT-5).
 */
export const getGmtOffset = () => {
  const offsetInMinutes = new Date().getTimezoneOffset();
  const offsetInHours = -offsetInMinutes / 60;

  return offsetInHours;
};

/**
 * Determines if the current device is a mobile or tablet based on the user agent string.
 *
 * @return {boolean} True if the device is a mobile or tablet, false otherwise.
 */
export const isMobileOrTablet = (): boolean => {
  const ua = navigator.userAgent || (window as { opera?: string }).opera || "";

  const isIOS = /iPad|iPhone|iPod/.test(ua) || navigator.maxTouchPoints > 1;
  const isAndroid = /Android/.test(ua);

  return isIOS || isAndroid;
};

/**
 * Pluralizes a word based on the count.
 *
 * @param count - The count to determine singular or plural.
 * @param word - The base form of the word.
 * @returns The appropriate form of the word based on the count.
 */
export const pluralize = (count: number, word: string) => {
  return count === 1 ? word : `${word}s`;
};

/**
 * Formats a count value for display.
 *
 * @param value - The count value to format (e.g., 1234).
 * @param locale - The locale to use for formatting (default: "da-DK").
 * @returns The formatted count string (e.g., "1.234").
 */
export const formatCount = (
  value: string | number | undefined | null,
  locale = "da-DK"
) => {
  if (!value) return "-";
  if (typeof value === "string" && /[KM]/i.test(value)) {
    return value;
  }
  return Number(value).toLocaleString(locale);
};

/**
 * Capitalizes the first letter of a given string.
 *
 * @param str - The string to capitalize.
 * @returns The string with the first letter capitalized.
 */
export const capitalizeFirstLetter = (str: string): string => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};
