// fetch, or a test's stand-in for it
export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;
