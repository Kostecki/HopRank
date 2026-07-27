import { describe, expect, it } from "vitest";

import { isValidVoteScore, sliderConf } from "./utils";

describe("isValidVoteScore", () => {
  const { stepSize, max } = sliderConf();
  const stepsCount = Math.round(max / stepSize);
  const validSteps = Array.from(
    { length: stepsCount },
    (_, i) => (i + 1) * stepSize
  );

  it.each(validSteps)("accepts valid step value %f", (score) => {
    expect(isValidVoteScore(score)).toBe(true);
  });

  it.each([0, -1, -0.25, 5.25, 100, 0.3, 1.1, NaN, Infinity, -Infinity])(
    "rejects invalid value %s",
    (score) => {
      expect(isValidVoteScore(score)).toBe(false);
    }
  );

  it.each(["3", null, undefined, {}, [], true])(
    "rejects non-number input %s",
    (score) => {
      expect(isValidVoteScore(score)).toBe(false);
    }
  );
});
