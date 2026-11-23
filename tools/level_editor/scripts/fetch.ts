// fetch, or a test's stand-in for it
export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

// a request that gives up after timeoutMs
export const fetchWithTimeout = (
  fetchUrl: Fetch,
  url: string,
  timeoutMs: number,
  init: RequestInit = {},
) => fetchUrl(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
