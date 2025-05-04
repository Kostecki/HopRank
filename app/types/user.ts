export type SessionUser = {
  id: number;
  email: string;
  untappd?: {
    id: number;
    username: string;
    accessToken: string;
    name: string;
    avatar: string;
  };
};
