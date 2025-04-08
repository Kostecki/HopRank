const slateIndigo = "#484F65";

const sliderConf = {
  min: 0,
  max: 5,
  stepSize: 0.1,
  defaultValue: 2.5,
};

const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

export { slateIndigo, sliderConf, wait };
