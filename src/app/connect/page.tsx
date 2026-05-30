"use client";

import { useEffect, useState } from "react";
import { parseCurl, type RequestDescriptor } from "@/lib/curl";
import {
  addSource,
  loadSources,
  removeSource,
  runSource,
  type DataSource,
} from "@/lib/store";

function redact(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (/authorization|cookie|token|api[-_]?key/i.test(k)) {
      out[k] = v.length > 12 ? `${v.slice(0, 8)}…(${v.length} chars)` : "•••";
    } else {
      out[k] = v;
    }
  }
  return out;
}

export default function ConnectPage() {
  const [curl, setCurl] = useState("");
  const [name, setName] = useState("");
  const [parsed, setParsed] = useState<RequestDescriptor | null>(null);
  const [error, setError] = useState("");
  const [testMsg, setTestMsg] = useState("");
  const [sources, setSources] = useState<DataSource[]>([]);

  useEffect(() => setSources(loadSources()), []);

  const onParse = () => {
    setError("");
    setTestMsg("");
    try {
      setParsed(parseCurl(curl));
    } catch (e) {
      setParsed(null);
      setError(e instanceof Error ? e.message : "Failed to parse");
    }
  };

  const onTest = async () => {
    if (!parsed) return;
    setTestMsg("Testing…");
    try {
      const res = await runSource(parsed);
      if (res.error) setTestMsg(`❌ ${res.error}`);
      else if (!res.ok) setTestMsg(`⚠️ Got HTTP ${res.status} — token may be expired.`);
      else setTestMsg(`✅ Success (HTTP ${res.status}). Data received.`);
    } catch (e) {
      setTestMsg(`❌ ${e instanceof Error ? e.message : "Request failed"}`);
    }
  };

  const onSave = () => {
    if (!parsed) return;
    const src: DataSource = {
      id: crypto.randomUUID(),
      name: name.trim() || new URL(parsed.url).pathname,
      request: parsed,
      createdAt: Date.now(),
    };
    addSource(src);
    setSources(loadSources());
    setCurl("");
    setName("");
    setParsed(null);
    setTestMsg("Saved! Open the Dashboard to view it.");
  };

  const onRemove = (id: string) => {
    removeSource(id);
    setSources(loadSources());
  };

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold">Connect a GobbleCube data source</h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
          GobbleCube has no public API, so we replay the dashboard&apos;s own data
          request. In your browser: open the GobbleCube page, press F12 →{" "}
          <b>Network</b> tab → filter <b>Fetch/XHR</b> → reload the page → click the
          request that returns the chart data → right-click →{" "}
          <b>Copy → Copy as cURL</b>. Paste it below.
        </p>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <label className="block text-sm font-medium">Source name (optional)</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Blinkit Category RCA"
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
        />

        <label className="mt-4 block text-sm font-medium">Paste cURL command</label>
        <textarea
          value={curl}
          onChange={(e) => setCurl(e.target.value)}
          rows={8}
          placeholder="curl 'https://app.gobblecube.ai/api/...' -H 'authorization: Bearer ...' ..."
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 font-mono text-xs dark:border-zinc-700"
        />

        <div className="mt-3 flex flex-wrap gap-3">
          <button
            onClick={onParse}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
          >
            Parse
          </button>
          <button
            onClick={onTest}
            disabled={!parsed}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-40 dark:border-zinc-700"
          >
            Test request
          </button>
          <button
            onClick={onSave}
            disabled={!parsed}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
          >
            Save source
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {testMsg && <p className="mt-3 text-sm">{testMsg}</p>}

        {parsed && (
          <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-xs dark:bg-zinc-800">
            <div>
              <b>{parsed.method}</b> {parsed.url}
            </div>
            <pre className="mt-2 overflow-x-auto">
              {JSON.stringify(redact(parsed.headers), null, 2)}
            </pre>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Saved sources ({sources.length})</h2>
        {sources.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">None yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {sources.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-zinc-500">{s.request.url}</div>
                </div>
                <button
                  onClick={() => onRemove(s.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
