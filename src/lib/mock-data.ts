export type ApiConnectionStatus = "ok" | "partial" | "error";

export type ScanResultRow = {
  id: string;
  email: string;
  name: string;
  title: string;
  company: string;
  domain: string;
  confidence: number;
  status: "verified" | "accept_all" | "webmail";
  saved?: boolean;
};

export type SavedLead = {
  id: string;
  email: string;
  company: string;
  domain: string;
  contactName: string;
  title: string;
  confidence: number;
  tags: string[];
  status: "new" | "contacted" | "interested" | "customer" | "not_relevant";
  note?: string;
  savedAt: string;
};

export type ScanRun = {
  id: string;
  type: "keyword_discovery" | "domain_scan";
  label: string;
  status: "completed" | "running" | "failed" | "cancelled";
  resultCount: number;
  startedAt: string;
  duration?: string;
};

export const MOCK_USER = {
  name: "Trang",
  initials: "TN",
  email: "trang.nguyen@vietsoftware.com.vn",
  plan: "PRO" as const,
};

export const MOCK_STATS = {
  scansThisMonth: 42,
  scansDelta: "+18% so tháng trước",
  emailsFound: 2840,
  emailsDelta: "+124 hôm nay",
  savedLeads: 348,
  savedDelta: "+24 tuần này",
  hunterQuota: { used: 320, total: 500, resetLabel: "Reset 01 / 06" },
};

export const MOCK_RESULTS: ScanResultRow[] = [
  {
    id: "1",
    email: "trang.nguyen@vietsoftware.com.vn",
    name: "Nguyễn Thị Trang",
    title: "Marketing Manager",
    company: "VietSoftware JSC",
    domain: "vietsoftware.com.vn",
    confidence: 95,
    status: "verified",
    saved: true,
  },
  {
    id: "2",
    email: "contact@realgroup.vn",
    name: "—",
    title: "—",
    company: "Real Group Marketing",
    domain: "realgroup.vn",
    confidence: 68,
    status: "accept_all",
  },
  {
    id: "3",
    email: "hr@greenhouse.vn",
    name: "Lê Văn Hùng",
    title: "HR Director",
    company: "Green House Co., Ltd",
    domain: "greenhouse.vn",
    confidence: 88,
    status: "verified",
  },
  {
    id: "4",
    email: "sales@fpt.com.vn",
    name: "Phạm Minh",
    title: "Sales Lead",
    company: "FPT Corporation",
    domain: "fpt.com.vn",
    confidence: 72,
    status: "verified",
  },
];

export const MOCK_SAVED_LEADS: SavedLead[] = [
  {
    id: "s1",
    email: "trang.nguyen@vietsoftware.com.vn",
    company: "VietSoftware JSC",
    domain: "vietsoftware.com.vn",
    contactName: "Nguyễn Thị Trang",
    title: "Marketing Manager",
    confidence: 95,
    tags: ["B2B", "Ưu tiên"],
    status: "contacted",
    savedAt: "15 / 05 / 2026",
  },
  {
    id: "s2",
    email: "contact@realgroup.vn",
    company: "Real Group Marketing",
    domain: "realgroup.vn",
    contactName: "—",
    title: "—",
    confidence: 68,
    tags: ["Marketing"],
    status: "new",
    savedAt: "12 / 05 / 2026",
  },
  {
    id: "s3",
    email: "hr@greenhouse.vn",
    company: "Green House Co., Ltd",
    domain: "greenhouse.vn",
    contactName: "Lê Văn Hùng",
    title: "HR Director",
    confidence: 88,
    tags: [],
    status: "interested",
    note: "Gọi lại tuần sau",
    savedAt: "10 / 05 / 2026",
  },
];

export const MOCK_SCAN_HISTORY: ScanRun[] = [
  {
    id: "run-42",
    type: "domain_scan",
    label: "4 domain · Hunter.io",
    status: "completed",
    resultCount: 12,
    startedAt: "18 / 05 / 2026 · 09:14",
    duration: "2m 18s",
  },
  {
    id: "run-41",
    type: "keyword_discovery",
    label: "phần mềm ERP · VN",
    status: "completed",
    resultCount: 28,
    startedAt: "17 / 05 / 2026 · 15:02",
    duration: "45s",
  },
  {
    id: "run-40",
    type: "domain_scan",
    label: "12 domain · Hunter.io",
    status: "failed",
    resultCount: 0,
    startedAt: "16 / 05 / 2026 · 11:20",
  },
];

export const MOCK_ADMIN_USERS = [
  { id: "u1", name: "Nguyễn Thị Trang", email: "trang.nguyen@vietsoftware.com.vn", plan: "PRO", status: "active", scans: 42 },
  { id: "u2", name: "Lê Hoàng Nam", email: "nam.le@example.com", plan: "BASIC", status: "active", scans: 8 },
  { id: "u3", name: "Phạm Thu Hà", email: "ha.pham@example.com", plan: "TRIAL", status: "locked", scans: 2 },
];

export const DEFAULT_DOMAINS = `vietsoftware.com.vn
realgroup.vn
fpt.com.vn
greenhouse.vn`;
