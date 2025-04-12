const sliderConf = {
  min: 0.25,
  max: 5,
  stepSize: 0.25,
  defaultValue: 2.5,
};

const getPageTitle = (pageTitle: string) => {
  return `${pageTitle} - HopRank`;
};

const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

export { sliderConf, getPageTitle, wait };
