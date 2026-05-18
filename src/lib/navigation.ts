import type { LucideIcon } from "lucide-react";
import {
  Bookmark,
  CreditCard,
  CircleHelp,
  History,
  Home,
  MailSearch,
  Settings,
  Table2,
  Target,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  section?: "workspace" | "account";
};

export const WORKSPACE_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home, section: "workspace" },
  { href: "/discover", label: "Keyword Discovery", icon: Target, section: "workspace" },
  { href: "/scan", label: "Domain Scan", icon: MailSearch, section: "workspace" },
  { href: "/results", label: "Results", icon: Table2, badge: 12, section: "workspace" },
  { href: "/leads", label: "Saved Leads", icon: Bookmark, badge: 348, section: "workspace" },
  { href: "/history", label: "Scan History", icon: History, section: "workspace" },
];

export const ACCOUNT_NAV: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings, section: "account" },
  { href: "/billing", label: "Subscription", icon: CreditCard, section: "account" },
  { href: "/help", label: "Help", icon: CircleHelp, section: "account" },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Tổng quan", icon: Home },
  { href: "/admin/users", label: "Người dùng", icon: Target },
];
