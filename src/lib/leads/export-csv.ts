import type { SavedLeadRecord } from "./types";

export function escapeCsvCell(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const CSV_HEADERS = [
  "email",
  "name",
  "title",
  "company",
  "domain",
  "confidence",
  "status",
  "source",
  "savedAt",
] as const;

export function savedLeadsToCsv(leads: SavedLeadRecord[]): string {
  const lines = [
    CSV_HEADERS.join(","),
    ...leads.map((l) =>
      [
        l.email,
        l.name,
        l.title,
        l.company,
        l.domain,
        l.confidence,
        l.status,
        l.source,
        l.savedAt,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ];
  return "\uFEFF" + lines.join("\r\n");
}

export function downloadCsvFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
