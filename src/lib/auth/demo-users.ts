import type { Session } from "./types";

export type DemoUser = Session & { password: string };

export const DEMO_USERS: DemoUser[] = [
  {
    id: "u-trang",
    email: "trang.nguyen@vietsoftware.com.vn",
    password: "demo123",
    name: "Trang Nguyễn",
    initials: "TN",
    plan: "PRO",
    role: "user",
  },
  {
    id: "u-admin",
    email: "admin@tooldatamail.dev",
    password: "admin123",
    name: "Admin",
    initials: "AD",
    plan: "PRO",
    role: "admin",
  },
];

export function findDemoUser(
  email: string,
  password: string,
): DemoUser | undefined {
  const target = email.trim().toLowerCase();
  return DEMO_USERS.find(
    (u) => u.email.toLowerCase() === target && u.password === password,
  );
}
