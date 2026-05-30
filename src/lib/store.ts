// Saved "data sources" — each is a captured GobbleCube request the user
// pasted as cURL. Stored in localStorage so it stays in the browser and
// the auth token never gets committed anywhere.
import type { RequestDescriptor } from "./curl";

export interface DataSource {
  id: string;
  name: string;
  request: RequestDescriptor;
  createdAt: number;
}

const KEY = "gobble.sources.v1";

export function loadSources(): DataSource[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as DataSource[];
  } catch {
    return [];
  }
}

export function saveSources(sources: DataSource[]) {
  localStorage.setItem(KEY, JSON.stringify(sources));
}

export function addSource(s: DataSource) {
  saveSources([...loadSources(), s]);
}

export function removeSource(id: string) {
  saveSources(loadSources().filter((s) => s.id !== id));
}

export interface ProxyResult {
  ok: boolean;
  status: number;
  contentType: string;
  data: unknown;
  error?: string;
}

export async function runSource(request: RequestDescriptor): Promise<ProxyResult> {
  const res = await fetch("/api/proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return (await res.json()) as ProxyResult;
}
