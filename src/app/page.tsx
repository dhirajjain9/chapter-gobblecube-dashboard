"use client";

import { useEffect, useMemo, useState } from "react";
import { DataChart } from "@/components/DataChart";
import { findDatasets, type Dataset } from "@/lib/flatten";
import { downloadCSV, toCSV, toTSV } from "@/lib/csv";
import { loadSources, runSource, type DataSource } from "@/lib/store";
import { expiryStatus } from "@/lib/jwt";

export default function Dashboard() {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [dsIndex, setDsIndex] = useState(0);
  const [categoryKey, setCategoryKey] = useState("");
  const [valueKeys, setValueKeys] = useState<string[]>([]);
  const [chartType, setChartType] = useState<"bar" | "line">("bar");

  useEffect(() => {
    const s = loadSources();
    setSources(s);
    if (s.length) setActiveId(s[0].id);
  }, []);

  const active = sources.find((s) => s.id === activeId);
  const dataset = datasets[dsIndex];

  const run = async () => {
    if (!active) return;
    setLoading(true);
    setStatus("Fetching…");
    setDatasets([]);
    try {
      const res = await runSource(active.request);
      if (res.error || !res.ok) {
        setStatus(`⚠️ ${res.error ?? `HTTP ${res.status}`} — your token may have expired. Re-capture it on the Connect page.`);
        return;
      }
      const found = findDatasets(res.data);
      setDatasets(found);
      setDsIndex(0);
      if (found.length === 0) {
        setStatus("Connected, but no table-like data was found in the response. Send me the raw JSON and I'll map it.");
      } else {
        setStatus(`Found ${found.length} dataset(s). Showing the largest.`);
      }
    } catch (e) {
      setStatus(`❌ ${e instanceof Error ? e.message : "Request failed"}`);
    } finally {
      setLoading(false);
    }
  };

  // Auto-pick sensible default columns when a dataset loads.
  useEffect(() => {
    if (!dataset) return;
    setCategoryKey(dataset.categoryColumns[0] ?? dataset.columns[0] ?? "");
    setValueKeys(dataset.numericColumns.slice(0, 2));
  }, [dataset]);

  const toggleValue = (k: string) =>
    setValueKeys((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));

  const tableColumns = useMemo(() => dataset?.columns ?? [], [dataset]);

  if (sources.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
        <h1 className="text-xl font-semibold">No data sources yet</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
          Capture a GobbleCube request from your browser to get started.
        </p>
        <a
          href="/connect"
          className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
        >
          Connect a source →
        </a>
      </div>
    );
  }

  const exp = active ? expiryStatus(active.request.headers) : null;

  return (
    <div className="space-y-6">
      {exp?.expired && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          ⚠️ {exp.label}. Paste a fresh token on the{" "}
          <a href="/connect" className="underline">Connect</a> page.
        </div>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-500">Data source</label>
          <select
            value={activeId}
            onChange={(e) => setActiveId(e.target.value)}
            className="mt-1 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
          >
            {sources.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900"
        >
          {loading ? "Loading…" : "Refresh data"}
        </button>
        {status && <span className="text-sm text-zinc-600 dark:text-zinc-400">{status}</span>}
      </div>

      {datasets.length > 1 && (
        <div>
          <label className="block text-xs font-medium text-zinc-500">Dataset</label>
          <select
            value={dsIndex}
            onChange={(e) => setDsIndex(Number(e.target.value))}
            className="mt-1 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
          >
            {datasets.map((d, i) => (
              <option key={i} value={i}>{d.path} ({d.rows.length} rows)</option>
            ))}
          </select>
        </div>
      )}

      {dataset && (
        <>
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500">Category (X axis)</label>
                <select
                  value={categoryKey}
                  onChange={(e) => setCategoryKey(e.target.value)}
                  className="mt-1 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
                >
                  {dataset.columns.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500">Chart</label>
                <select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value as "bar" | "line")}
                  className="mt-1 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
                >
                  <option value="bar">Bar</option>
                  <option value="line">Line</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-500">Values</label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {dataset.numericColumns.length === 0 && (
                    <span className="text-xs text-zinc-500">No numeric columns detected.</span>
                  )}
                  {dataset.numericColumns.map((c) => (
                    <button
                      key={c}
                      onClick={() => toggleValue(c)}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        valueKeys.includes(c)
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-zinc-300 dark:border-zinc-700"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DataChart rows={dataset.rows} categoryKey={categoryKey} valueKeys={valueKeys} type={chartType} />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => downloadCSV(active?.name ?? "gobble-data", toCSV(dataset.rows, tableColumns))}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
            >
              ⬇ Download CSV (Excel)
            </button>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(toTSV(dataset.rows, tableColumns));
                setStatus("Copied! Paste into Google Sheets (Ctrl/Cmd+V).");
              }}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
            >
              📋 Copy for Google Sheets
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800">
                <tr>
                  {tableColumns.map((c) => (
                    <th key={c} className="px-3 py-2 text-left font-medium">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataset.rows.slice(0, 100).map((r, i) => (
                  <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800">
                    {tableColumns.map((c) => (
                      <td key={c} className="px-3 py-2">
                        {typeof r[c] === "object" ? JSON.stringify(r[c]) : String(r[c] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
