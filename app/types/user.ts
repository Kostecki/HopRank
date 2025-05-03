export type SessionUser = {
  id: number;
  email: string;

  // Untappd specific
  untappdId?: number;
  untappdAccessToken?: string;
  name?: string;
  avatar?: string;
};
