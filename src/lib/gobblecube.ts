// Reads and rewrites the GobbleCube request body's filter block so the
// dashboard can change date range / platform / own-brand without the user
// re-capturing a new cURL. Only mutates keys that already exist in the
// captured body, so it stays safe across different endpoints.

export interface GcFilters {
  startDate: string;
  endDate: string;
  compareStart?: string;
  compareEnd?: string;
  platform?: string;
  ownBrand?: boolean;
}

type Json = Record<string, unknown>;

function asObj(v: unknown): Json | undefined {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : undefined;
}

export function parseBody(body?: string): Json | null {
  if (!body) return null;
  try {
    const o = JSON.parse(body);
    return asObj(o) ?? null;
  } catch {
    return null;
  }
}

// Returns null when the body has no recognizable filter block.
export function extractFilters(obj: Json): GcFilters | null {
  const filters = asObj(obj.filters);
  const dp = asObj(filters?.date_params);
  if (!dp) return null;

  const vp = asObj(filters?.value_params) ?? {};
  const platformArr = vp["qcom-pid-platform"];
  const ownArr = vp["qcom-pid-is-own-brand"];
  const compare = asObj(dp.compare_with);

  return {
    startDate: typeof dp.start_date === "string" ? dp.start_date : "",
    endDate: typeof dp.end_date === "string" ? dp.end_date : "",
    compareStart: typeof compare?.start_date === "string" ? compare.start_date : undefined,
    compareEnd: typeof compare?.end_date === "string" ? compare.end_date : undefined,
    platform: Array.isArray(platformArr) ? String(platformArr[0]) : undefined,
    ownBrand: Array.isArray(ownArr) ? ownArr[0] === 1 : undefined,
  };
}

export function applyFilters(body: string, f: GcFilters): string {
  const obj = JSON.parse(body) as Json;
  const filters = asObj(obj.filters);

  const dp = asObj(filters?.date_params);
  if (dp) {
    if (f.startDate) dp.start_date = f.startDate;
    if (f.endDate) dp.end_date = f.endDate;
    const compare = asObj(dp.compare_with);
    if (compare) {
      if (f.compareStart) compare.start_date = f.compareStart;
      if (f.compareEnd) compare.end_date = f.compareEnd;
    }
  }

  const setVP = (vp: Json | undefined) => {
    if (!vp) return;
    if (f.platform != null && "qcom-pid-platform" in vp) vp["qcom-pid-platform"] = [f.platform];
    if (f.ownBrand != null && "qcom-pid-is-own-brand" in vp)
      vp["qcom-pid-is-own-brand"] = [f.ownBrand ? 1 : 0];
  };
  setVP(asObj(filters?.value_params));
  setVP(asObj(obj.value_params));

  return JSON.stringify(obj);
}

// Common quick-commerce platforms; the captured value is always included.
export const KNOWN_PLATFORMS = ["Blinkit", "Zepto", "Instamart", "BigBasket", "Flipkart Minutes"];
