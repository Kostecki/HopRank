const sliderConf = () => {
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

const getPageTitle = (pageTitle: string) => `${pageTitle} - HopRank`;

const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

export { sliderConf, getPageTitle, wait };
