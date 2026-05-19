export type Role = "user" | "admin";

export type Plan = "PRO" | "BASIC" | "TRIAL";

export type Session = {
  id: string;
  email: string;
  name: string;
  initials: string;
  plan: Plan;
  role: Role;
  authProvider?: "demo" | "supabase";
};

export const AUTH_COOKIE = "tdm_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
