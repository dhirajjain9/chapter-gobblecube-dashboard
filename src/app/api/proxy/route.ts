// Server-side proxy. The browser cannot call GobbleCube's API directly
// (CORS), so the client posts a RequestDescriptor here and we replay it
// from the server. Locked to GobbleCube hosts so this can't be abused as
// an open proxy.
import { NextRequest, NextResponse } from "next/server";
import type { RequestDescriptor } from "@/lib/curl";

const ALLOWED_HOST_SUFFIX = ["gobblecube.ai"];

// Hop-by-hop / host headers that must not be forwarded verbatim.
const STRIP_HEADERS = new Set([
  "host",
  "content-length",
  "connection",
  "accept-encoding",
]);

export async function POST(req: NextRequest) {
  let desc: RequestDescriptor;
  try {
    desc = (await req.json()) as RequestDescriptor;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(desc.url);
  } catch {
    return NextResponse.json({ error: "Invalid target URL" }, { status: 400 });
  }

  const allowed = ALLOWED_HOST_SUFFIX.some(
    (suffix) => target.hostname === suffix || target.hostname.endsWith(`.${suffix}`)
  );
  if (!allowed) {
    return NextResponse.json(
      { error: `Host not allowed: ${target.hostname}` },
      { status: 403 }
    );
  }

  const headers = new Headers();
  for (const [k, v] of Object.entries(desc.headers ?? {})) {
    if (!STRIP_HEADERS.has(k.toLowerCase())) headers.set(k, v);
  }

  try {
    const upstream = await fetch(target.toString(), {
      method: desc.method || "GET",
      headers,
      body: desc.method && desc.method !== "GET" ? desc.body : undefined,
      redirect: "follow",
    });

    const text = await upstream.text();
    const contentType = upstream.headers.get("content-type") ?? "";
    let payload: unknown = text;
    if (contentType.includes("application/json")) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }

    return NextResponse.json(
      {
        ok: upstream.ok,
        status: upstream.status,
        contentType,
        data: payload,
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upstream request failed" },
      { status: 502 }
    );
  }
}
