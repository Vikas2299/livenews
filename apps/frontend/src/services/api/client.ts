import { Platform } from 'react-native';

export class ApiError extends Error {
    status: number;
    body?: unknown;
    constructor(status: number, message: string, body?: unknown) {
        super(message);
        this.status = status;
        this.body = body;
    }
}

// For Android emulator, use 10.0.2.2 to access host machine's localhost
// For physical Android device, use your computer's IP address
// For iOS simulator and web, use localhost
function getDefaultBaseUrl(): string {
    if (Platform.OS === 'android') {
        // Android emulator uses 10.0.2.2 to access host machine
        return "http://10.0.0.211:8000";
    }
    // iOS simulator and web can use localhost
    return "http://127.0.0.1:8000";
}

const BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "") || getDefaultBaseUrl()

// Export BASE_URL for debugging
export const getBaseUrl = () => BASE_URL;


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
    
    // Log the URL for debugging (remove in production if needed)
    console.log(`[API] Fetching: ${url}`);
    console.log(`[API] Platform: ${Platform.OS}`);
    console.log(`[API] BASE_URL: ${BASE_URL}`);
    
    try {
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
    } catch (error: any) {
        // Enhanced error logging for network failures
        if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
            console.error(`[API] Network request failed for URL: ${url}`);
            console.error(`[API] Make sure:`);
            console.error(`  1. Backend is running on port 8000`);
            console.error(`  2. Backend is started with --host 0.0.0.0`);
            console.error(`  3. For Android emulator, using 10.0.2.2:8000`);
            console.error(`  4. For physical device, set EXPO_PUBLIC_API_URL to your computer's IP`);
            throw new Error(`Network request failed. URL: ${url}. ${error.message}`);
        }
        throw error;
    }
}