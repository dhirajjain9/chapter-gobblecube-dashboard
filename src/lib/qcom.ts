/* eslint-disable @typescript-eslint/no-explicit-any */
// Parser for GobbleCube's qcom_overview_metric_data response. The endpoint
// returns metrics as data[] (each with a compare period p1, current period
// p2, and a monthly trend) plus display_info[] describing names/formats.

export interface QcomMetric {
  id: string;
  name: string;
  format: string; // "currency" | "percent" | "number" | ...
  precision: number;
  info?: string;
  current: number | null; // p2.agg.value
  compare: number | null; // p1.agg.value
  trend: { month: string; value: number | null }[];
}

export interface QcomData {
  metrics: QcomMetric[];
  months: string[];
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

// Returns null if the payload isn't a qcom metric-data response.
export function parseQcomMetrics(raw: unknown): QcomData | null {
  const body = raw as any;
  const dataArr = body?.data;
  const displayInfo = body?.display_info;
  if (!Array.isArray(dataArr) || !Array.isArray(displayInfo)) return null;

  const byKey = new Map<string, any>();
  for (const d of dataArr) if (d?.metric_key) byKey.set(d.metric_key, d);

  const metrics: QcomMetric[] = [];
  let months: string[] = [];

  for (const info of displayInfo) {
    if (info?.key_type !== "metric") continue;
    const d = byKey.get(info.id_);
    if (!d) continue;

    const x: string[] = d?.p2?.trend?.x ?? [];
    const y: any[] = d?.p2?.trend?.y ?? [];
    if (x.length > months.length) months = x;
    const trend = x.map((m, i) => ({ month: m, value: num(y[i]) }));

    metrics.push({
      id: String(info.id_),
      name: String(info.name ?? info.id_).replace(/<br\s*\/?>/gi, " ").replace(/\s+/g, " ").trim(),
      format: String(info.format ?? "number"),
      precision: typeof info.precision === "number" ? info.precision : 1,
      info: info.info ?? undefined,
      current: num(d?.p2?.agg?.value),
      compare: num(d?.p1?.agg?.value),
      trend,
    });
  }

  if (metrics.length === 0) return null;
  return { metrics, months };
}

// Format a value according to GobbleCube's display format (Indian numbering).
export function formatMetric(v: number | null, format: string, precision = 1): string {
  if (v == null) return "—";
  if (format === "percent") {
    return `${v.toLocaleString("en-IN", { maximumFractionDigits: Math.max(precision, 2) })}%`;
  }
  if (format === "currency" || format === "number") {
    const prefix = format === "currency" ? "₹" : "";
    const abs = Math.abs(v);
    if (abs >= 1e7) return `${prefix}${(v / 1e7).toFixed(precision)} Cr`;
    if (abs >= 1e5) return `${prefix}${(v / 1e5).toFixed(precision)} L`;
    if (abs >= 1e3) return `${prefix}${v.toLocaleString("en-IN", { maximumFractionDigits: precision })}`;
    return `${prefix}${v.toLocaleString("en-IN", { maximumFractionDigits: precision })}`;
  }
  return v.toLocaleString("en-IN", { maximumFractionDigits: precision });
}

// Percent change from compare -> current.
export function deltaPct(current: number | null, compare: number | null): number | null {
  if (current == null || compare == null || compare === 0) return null;
  return ((current - compare) / Math.abs(compare)) * 100;
}
