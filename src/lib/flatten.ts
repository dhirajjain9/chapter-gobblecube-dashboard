// GobbleCube's response shapes are unknown ahead of time, so we
// auto-discover the most "table-like" array of records anywhere in the
// JSON and flatten it into rows + columns the dashboard can chart.

export type Row = Record<string, unknown>;

export interface Dataset {
  // dotted path where the array was found, e.g. "data.rows"
  path: string;
  rows: Row[];
  columns: string[];
  numericColumns: string[];
  categoryColumns: string[];
}

function isRecordArray(v: unknown): v is Row[] {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    v.every((x) => x !== null && typeof x === "object" && !Array.isArray(x))
  );
}

// Walk the JSON tree and collect every array-of-objects, ranked by size.
export function findDatasets(json: unknown): Dataset[] {
  const found: { path: string; rows: Row[] }[] = [];

  const visit = (node: unknown, path: string) => {
    if (isRecordArray(node)) {
      found.push({ path: path || "(root)", rows: node });
      // still descend in case rows contain nested tables
    }
    if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node as Row)) {
        visit(v, path ? `${path}.${k}` : k);
      }
    }
  };
  visit(json, "");

  found.sort((a, b) => b.rows.length - a.rows.length);

  return found.map(({ path, rows }) => {
    const colSet = new Set<string>();
    for (const r of rows) for (const k of Object.keys(r)) colSet.add(k);
    const columns = [...colSet];

    const numericColumns = columns.filter((c) =>
      rows.some((r) => typeof r[c] === "number") &&
      rows.every((r) => r[c] == null || typeof r[c] === "number")
    );
    const categoryColumns = columns.filter((c) => !numericColumns.includes(c));

    return { path, rows, columns, numericColumns, categoryColumns };
  });
}
