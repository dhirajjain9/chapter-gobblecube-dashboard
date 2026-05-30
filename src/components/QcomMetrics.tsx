"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { deltaPct, formatMetric, type QcomData, type QcomMetric } from "@/lib/qcom";
import { downloadCSV, toCSV, toTSV } from "@/lib/csv";
import type { Row } from "@/lib/flatten";

function shortMonth(iso: string): string {
  // "2025-06-01" -> "Jun '25"
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

function KpiCard({ m, active, onClick }: { m: QcomMetric; active: boolean; onClick: () => void }) {
  const dp = deltaPct(m.current, m.compare);
  const up = dp != null && dp >= 0;
  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-[150px] rounded-xl border p-4 text-left transition-colors ${
        active
          ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950"
          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
      }`}
      title={m.info ?? ""}
    >
      <div className="text-xs font-medium text-zinc-500">{m.name}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">
        {formatMetric(m.current, m.format, m.precision)}
      </div>
      {dp != null && (
        <div className={`mt-1 text-xs font-medium ${up ? "text-emerald-600" : "text-red-600"}`}>
          {up ? "▲" : "▼"} {Math.abs(dp).toFixed(1)}% vs compare
        </div>
      )}
    </button>
  );
}

export function QcomMetrics({ data }: { data: QcomData }) {
  const { metrics, months } = data;
  const [selectedId, setSelectedId] = useState(metrics[0]?.id ?? "");
  const selected = metrics.find((m) => m.id === selectedId) ?? metrics[0];

  const chartData = useMemo(
    () => selected.trend.map((t) => ({ month: shortMonth(t.month), value: t.value })),
    [selected]
  );

  // Tidy matrix for export: one row per month, one column per metric.
  const exportRows: Row[] = useMemo(() => {
    return months.map((m) => {
      const row: Row = { Month: m };
      for (const metric of metrics) {
        const point = metric.trend.find((t) => t.month === m);
        row[metric.name] = point?.value ?? null;
      }
      return row;
    });
  }, [metrics, months]);
  const exportCols = ["Month", ...metrics.map((m) => m.name)];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-zinc-500">
          Click a metric to see its trend
        </h2>
        <div className="mt-2 flex flex-wrap gap-3">
          {metrics.map((m) => (
            <KpiCard key={m.id} m={m} active={m.id === selected.id} onClick={() => setSelectedId(m.id)} />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 text-sm font-medium">{selected.name} — last 12 months</div>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" fontSize={11} />
            <YAxis
              fontSize={11}
              width={70}
              tickFormatter={(v) => formatMetric(v as number, selected.format, 0)}
            />
            <Tooltip
              formatter={(v) => formatMetric(v as number, selected.format, selected.precision)}
            />
            <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => downloadCSV("gobblecube-metrics", toCSV(exportRows, exportCols))}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
        >
          ⬇ Download CSV (Excel)
        </button>
        <button
          onClick={() => navigator.clipboard.writeText(toTSV(exportRows, exportCols))}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
        >
          📋 Copy for Google Sheets
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-800">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Month</th>
              {metrics.map((m) => (
                <th key={m.id} className="px-3 py-2 text-right font-medium">{m.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="px-3 py-2">{shortMonth(m)}</td>
                {metrics.map((metric) => {
                  const point = metric.trend.find((t) => t.month === m);
                  return (
                    <td key={metric.id} className="px-3 py-2 text-right tabular-nums">
                      {formatMetric(point?.value ?? null, metric.format, metric.precision)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
