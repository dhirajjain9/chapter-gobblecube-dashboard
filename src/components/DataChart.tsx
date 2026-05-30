"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Row } from "@/lib/flatten";

const COLORS = ["#2563eb", "#16a34a", "#ea580c", "#9333ea", "#dc2626", "#0891b2"];

export function DataChart({
  rows,
  categoryKey,
  valueKeys,
  type,
}: {
  rows: Row[];
  categoryKey: string;
  valueKeys: string[];
  type: "bar" | "line";
}) {
  const data = rows.slice(0, 50).map((r) => {
    const o: Record<string, unknown> = { [categoryKey]: r[categoryKey] };
    for (const k of valueKeys) o[k] = r[k];
    return o;
  });

  if (valueKeys.length === 0) {
    return <p className="text-sm text-zinc-500">Pick at least one value column to chart.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={380}>
      {type === "bar" ? (
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 60, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey={categoryKey} angle={-35} textAnchor="end" height={80} fontSize={11} interval={0} />
          <YAxis fontSize={11} />
          <Tooltip />
          <Legend />
          {valueKeys.map((k, i) => (
            <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} />
          ))}
        </BarChart>
      ) : (
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 60, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey={categoryKey} angle={-35} textAnchor="end" height={80} fontSize={11} interval={0} />
          <YAxis fontSize={11} />
          <Tooltip />
          <Legend />
          {valueKeys.map((k, i) => (
            <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} dot={false} />
          ))}
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}
