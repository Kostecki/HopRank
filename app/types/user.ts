export type SessionUser = {
  id: number;
  email: string;
  admin: boolean;
  untappd?: {
    id: number;
    username: string;
    accessToken: string;
    name: string;
    avatar: string;
  };
};
