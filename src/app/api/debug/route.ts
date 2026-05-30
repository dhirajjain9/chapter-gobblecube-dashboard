// TEMPORARY debug endpoint. Lets us read the full GobbleCube response so we
// can map the dashboard to the real fields. The auth token is passed as a
// query param at request time (never committed) and only ever forwarded to
// GobbleCube. DELETE this route once the charts are wired up.
import { NextRequest, NextResponse } from "next/server";

const BODY = {
  cards: [
    { metric_key: "qcom-pid-offtake", title: "Offtake" },
    { meta: { tag: { info_key: "qcom-pid-sister-bgrs", label_key: "qcom-pid-platform-category" } }, metric_key: "qcom-pid-sum-total-category-share", title: "Est. Category Share" },
    { meta: { tag: { info_key: "qcom-pid-sister-bgrs", label_key: "qcom-pid-platform-category" } }, metric_key: "qcom-pid-est-cat-size", title: "Est. Category Size" },
  ],
  date_params: { remove_granularity: true },
  dimension_keys: ["qcom-pid-bgr", "qcom-pid-platform-category", "qcom-pid-sister-bgrs"],
  extra_metrics: ["qcom-pid-offtake-qty"],
  extras: { price_unit: "MRP", chart_granularity: "month", metric_runrates: { "qcom-pid-est-cat-size": { info: "Category Size Runrate", label: "Runrate" }, "qcom-pid-offtake": { info: "Offtake Runrate", label: "Runrate" } }, show_l12m: true },
  metric_format: { "qcom-pid-assortment": { precision: 0 } },
  metric_keys: ["qcom-pid-offtake", "qcom-pid-offtake-qty", "qcom-pid-sum-total-category-share", "qcom-pid-est-cat-size"],
  use_page_meta_filters: { dependent: ["qcom-pid-bgr", "qcom-pid-city"] },
  value_params: { "qcom-dim-platform-bundle": [0], "qcom-pid-is-own-brand": [1] },
  widgetIndex: 0,
  filters: {
    date_params: { compare_with: { end_date: "2026-04-28", start_date: "2026-04-01" }, date_picker_type: "range_picker", end_date: "2026-05-28", is_monthly: false, pick_latest_period_from_date_range: false, remove_granularity: true, skip_bounds: false, skip_granularity: true, start_date: "2026-05-01" },
    value_params: { "qcom-pid-platform": ["Blinkit"], "qcom-dim-platform-bundle": [0], "qcom-pid-is-own-brand": [1] },
  },
};

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 400 });

  const upstream = await fetch("https://app.gobblecube.ai/api/v1/dashboard/qcom_overview_metric_data", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      "x-brand": "pharmeasy_explore",
      "x-gc-platform": "blinkit",
      "x-module": "qcom",
      "x-platform": "blinkit",
      "x-gc-current-workspace-id": "8187c4ad-43e8-4179-8d4c-b0add457b8d0",
    },
    body: JSON.stringify(BODY),
  });

  const text = await upstream.text();
  let data: unknown = text;
  try { data = JSON.parse(text); } catch {}
  return NextResponse.json({ status: upstream.status, data });
}
