type rating = {
  id: number;
  name: string;
  rating: number;
};

export type Vote = {
  sessionId: number;
  userId: number;
  beerId: number;
  untappdBeerId: number;
  ratings: rating[];
};

export type SliderConfig = {
  stepSize: number;
  max: number;
  defaultValue: number;
  marks: { value: number }[];
};
