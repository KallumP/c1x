// the editor server's mod.io api (server/modioApi.ts)

import type { Uploaded } from "../scripts/levelUpload";
import type { LevelMod } from "../scripts/modio";

export type { LevelMod, Uploaded };

const NOT_SIGNED_IN = 401; // the server's answer when the player's sign-in is missing or has run out

// a refusal from the editor server: its text, and its status
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

const post = (url: string, body: unknown = {}) =>
  fetch(url, { method: "POST", body: JSON.stringify(body) });

export async function fetchSignedIn(): Promise<boolean> {
  return (await answer<{ signedIn: boolean }>(await fetch("/api/modio/account"))).signedIn;
}

export async function sendSignInEmail(email: string): Promise<void> {
  await answer(await post("/api/modio/email", { email }));
}

export async function submitSignInCode(code: string): Promise<void> {
  await answer(await post("/api/modio/code", { code }));
}

export async function signOutOfModio(): Promise<void> {
  await answer(await post("/api/modio/sign-out"));
}

// the player's mod for the level, or null if it isn't online
export async function fetchOwnLevelMod(name: string): Promise<LevelMod | null> {
  return (await answer<{ online: LevelMod | null }>(await fetch(levelUrl(name)))).online;
}

// logo is a base64 png, or null to keep the picture it has
export async function uploadLevel(
  name: string,
  summary: string,
  logo: string | null,
): Promise<Uploaded> {
  return answer(await post(`${levelUrl(name)}/upload`, { summary, logo }));
}
