export type AccountRole = "business" | "student";

export type SessionUser = {
  id: number;
  login: string;
  name: string;
  role: AccountRole;
};
