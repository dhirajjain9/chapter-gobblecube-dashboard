// Export helpers: download rows as CSV (opens cleanly in Excel) and copy
// as TSV (paste straight into Google Sheets).
import type { Row } from "./flatten";

function cell(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function toCSV(rows: Row[], columns: string[]): string {
  const esc = (s: string) => {
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = columns.map(esc).join(",");
  const body = rows.map((r) => columns.map((c) => esc(cell(r[c]))).join(",")).join("\n");
  return `${header}\n${body}`;
}

export function toTSV(rows: Row[], columns: string[]): string {
  const esc = (s: string) => s.replace(/\t/g, " ").replace(/\n/g, " ");
  const header = columns.join("\t");
  const body = rows.map((r) => columns.map((c) => esc(cell(r[c]))).join("\t")).join("\n");
  return `${header}\n${body}`;
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
