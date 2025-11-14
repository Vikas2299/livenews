import { getJSON } from "./client";

export type RawCoverRow = {
  cluster_id: number | string;
  image_url: string;          // backend returns remote publisher URL
  image_url_abs?: string;     // (optional) absolute URL, if you add later
  origin_url?: string;        // (optional) original publisher URL
  width?: number;
  height?: number;
};

export type CoversResponse = {
  count: number;
  rows: CoverRow[];
};

export type CoverRow = {
  clusterId: number;
  imageUrl: string;
  originUrl?: string;
  width?: number;
  height?: number;
  raw: RawCoverRow;
};

function normalize(r: RawCoverRow): CoverRow {
  const clusterId =
    typeof r.cluster_id === "string" ? parseInt(r.cluster_id, 10) : r.cluster_id;

  return {
    clusterId,
    imageUrl: r.image_url_abs || r.image_url,
    originUrl: r.origin_url,
    width: r.width,
    height: r.height,
    raw: r,
  };
}

/** GET /cluster-covers */
export async function getClusterCovers(opts?: {
  signal?: AbortSignal;
}): Promise<CoversResponse> {
  const res = await getJSON<{ count: number; rows: RawCoverRow[] }>(
    "/cluster-covers",
    { signal: opts?.signal }
  );
  return { count: res.count, rows: (res.rows ?? []).map(normalize) };
}

/** Convenience: Map clusterId -> imageUrl */
export function toCoverMapByClusterId(rows: CoverRow[]): Map<number, string> {
  const m = new Map<number, string>();
  for (const r of rows) m.set(r.clusterId, r.imageUrl);
  return m;
}