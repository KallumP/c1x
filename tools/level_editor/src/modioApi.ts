// the editor server's mod.io api (server/modioApi.ts)

export interface LevelMod {
  id: number;
  page: string; // its page on mod.io
}

export interface Uploaded {
  mod: LevelMod;
  isNew: boolean; // whether its mod was added, rather than updated
}

const levelUrl = (name: string) => `/api/modio/levels/${encodeURIComponent(name)}`;

// the response's json, or its text as an error if the server refused
async function answer<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

const post = (url: string, body: unknown = {}) => fetch(url, { method: "POST", body: JSON.stringify(body) });

export async function fetchSignedIn(): Promise<boolean> {
  return (await answer<{ signedIn: boolean }>(await fetch("/api/modio/account"))).signedIn;
}

export async function sendSignInEmail(email: string): Promise<void> {
  await answer(await post("/api/modio/email", { email }));
}

export async function sendSignInCode(code: string): Promise<void> {
  await answer(await post("/api/modio/code", { code }));
}

export async function signOutOfModio(): Promise<void> {
  await answer(await post("/api/modio/sign-out"));
}

// the player's mod for the level, or null if it isn't online
export async function fetchOnlineLevel(name: string): Promise<LevelMod | null> {
  return (await answer<{ online: LevelMod | null }>(await fetch(levelUrl(name)))).online;
}

export async function uploadLevel(name: string, summary: string, logo: string): Promise<Uploaded> {
  return answer(await post(`${levelUrl(name)}/upload`, { summary, logo }));
}
