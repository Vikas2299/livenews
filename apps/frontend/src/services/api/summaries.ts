import {getJSON} from "./client";

export type RawSummaryRow = {
    "Article title": string;
    LEFT?: string;
    RIGHT?: string;
    CENTER?: string;
} & Record<string, unknown>

export interface SummariesResponse {
    count: number;
    rows: SummaryRow[];
}

export interface SummaryRow {
    title: string;
    left?: string;
    right?: string;
    center?: string;
    raw: RawSummaryRow;
}


function normalize(r: RawSummaryRow): SummaryRow {
    return {
        title: r["Article title"], 
        left: r.LEFT,
        right: r.RIGHT, 
        center: r.CENTER,
        raw: r,
    };
}


export async function getSummaries(opts?: {
    clusterTitle?: string;
    signal?: AbortSignal;
}): Promise<SummariesResponse> { 
    const res = await getJSON<{count: number; rows: RawSummaryRow[] }> (
        "/summaries",
        {query: {cluster_title: opts?.clusterTitle}, signal: opts?.signal}
    );

    return { count : res.count, rows: (res.rows ?? []).map(normalize) };
}