// the editor server's mod.io api (server/modioApi.ts)

import type { Uploaded } from "../scripts/levelUpload";
import type { Fetch } from "../scripts/fetch";
import type { LevelMod } from "../scripts/modio";

export type { LevelMod, Uploaded };

// the server's answer when the player's sign-in is missing or has run out
const NOT_SIGNED_IN = 401;

class RefusedError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

// whether what a request threw says the player isn't signed in to mod.io any more
export const isSignedOutError = (error: unknown) =>
  error instanceof RefusedError && error.status === NOT_SIGNED_IN;

const levelUrl = (name: string) => `/api/modio/levels/${encodeURIComponent(name)}`;

// the response's json, or a RefusedError with its text if the server refused
async function answer<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new RefusedError(await response.text(), response.status);
  }
  return response.json();
}

const post = (fetchUrl: Fetch, url: string, body: unknown = {}) =>
  fetchUrl(url, { method: "POST", body: JSON.stringify(body) });

// each takes fetch, or a test's stand-in for it

export async function fetchSignedIn(fetchUrl: Fetch = fetch): Promise<boolean> {
  const account = await answer<{ signedIn: boolean }>(await fetchUrl("/api/modio/account"));
  return account.signedIn;
}

export async function sendSignInEmail(email: string, fetchUrl: Fetch = fetch): Promise<void> {
  await answer(await post(fetchUrl, "/api/modio/email", { email }));
}

export async function submitSignInCode(code: string, fetchUrl: Fetch = fetch): Promise<void> {
  await answer(await post(fetchUrl, "/api/modio/code", { code }));
}

export async function signOutOfModio(fetchUrl: Fetch = fetch): Promise<void> {
  await answer(await post(fetchUrl, "/api/modio/sign-out"));
}

// the player's mod for the level, or null if it isn't online
export async function fetchOwnLevelMod(
  name: string,
  fetchUrl: Fetch = fetch,
): Promise<LevelMod | null> {
  const own = await answer<{ online: LevelMod | null }>(await fetchUrl(levelUrl(name)));
  return own.online;
}

// logo is a base64 png, or null to keep the picture it has
export async function uploadLevel(
  name: string,
  summary: string,
  logo: string | null,
  fetchUrl: Fetch = fetch,
): Promise<Uploaded> {
  return answer(await post(fetchUrl, `${levelUrl(name)}/upload`, { summary, logo }));
}
