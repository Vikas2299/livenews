export class ApiError extends Error {
    status: number;
    body?: unknown;
    constructor(status: number, message: string, body?: unknown) {
        super(message);
        this.status = status;
        this.body = body;
    }
}

const BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "") || "http://127.0.0.1:8000"


function buildUrl(path: string, query?: Record<string, unknown>) {
    const url = new URL(`${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`);

    if (query){
        Object.entries(query).forEach(([k,v]) => {
            if ( v !== undefined && v !== null && v !== "") {
                url.searchParams.append(k, String(v));
            }
        });
    }
    return url.toString();
}


async function parseOrUndefined(res: Response){
    try {
        return await res.json();
    } catch {
        return undefined;
    }
}


export async function getJSON<T>(
    path: string, 
    opts: { query?: Record<string, unknown>; signal?: AbortSignal } = {}
): Promise<T> {
    const url = buildUrl(path, opts.query);
    const res = await fetch(url, {
        method: "GET", 
        headers: {Accept: "application/json"},
        signal: opts.signal, 
    });

    if (!res.ok) {
        const body = await parseOrUndefined(res);
        throw new ApiError(res.status, (body as any)?.message ?? res.statusText, body);
    }

    return (await res.json()) as T;
}