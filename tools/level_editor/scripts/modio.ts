// mod.io's api, where custom levels are shared (see doc/custom_levels.md): each
// level is a mod of c1x's game there, its file a zip of the level's source folder
import { errorMessage } from "../src/errorMessage";
import { isProblem, type Answer, type Problem } from "./answer";
import { fetchWithTimeout } from "./download";
import type { Fetch } from "./fetch";

// c1x's game on mod.io (https://mod.io/g/crash-1-n-hanced). the api key only
// reads what's public, so it ships with the game, as mod.io means it to
export const MODIO_GAME = {
  apiUrl: "https://g-14831.modapi.io/v1",
  gameId: 14831,
  apiKey: "47f26292d1f91710d3499d89459a4d1c",
};

const LEVEL_TAG = "Level";
const TIMEOUT_MS = 60000; // uploads can be big

export interface NewLevel {
  name: string;    // the title players see
  summary: string;
  folder: string;  // its folder in level_src/, kept as the mod's metadata
  logo: Uint8Array; // a 16:9 png
}

export interface LevelMod {
  id: number;
  page: string; // its page on mod.io
}

type ModAnswer = { id: number; metadata_blob?: string; profile_url: string };

const JSON_ACCEPTED = { Accept: "application/json" };

const gameUrl = (path: string) =>
  `${MODIO_GAME.apiUrl}/games/${MODIO_GAME.gameId}${path}`;
const signedInHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  ...JSON_ACCEPTED,
});

type Refusal = { error?: { message?: string; errors?: Record<string, string> } } | null;

// mod.io's message in a refusal, with what it says is wrong with each field
function refusalReason(answer: unknown, status: number): string {
  const error = (answer as Refusal)?.error;
  if (!error?.message) {
    return `mod.io answered ${status}`;
  }
  return [error.message, ...Object.values(error.errors ?? {})].join(" ");
}

const isSignedInRequest = (init: RequestInit) =>
  new Headers(init.headers).has("Authorization");

// why mod.io refused a request: signed out too if it was the player's token it
// refused (a wrong emailed code is refused the same way, but isn't signed in)
function refusal(answer: unknown, status: number, init: RequestInit): Problem {
  const problem = refusalReason(answer, status);
  if (status === 401 && isSignedInRequest(init)) {
    return { problem, signedOut: true };
  }
  return { problem };
}

// mod.io's answer to a request, taken to be a T (the shape mod.io documents for
// it), or why there isn't one
async function askModio<T>(
  fetchUrl: Fetch,
  url: string,
  init: RequestInit,
): Promise<Answer<T>> {
  try {
    const response = await fetchWithTimeout(fetchUrl, url, TIMEOUT_MS, init);
    const answer = await response.json().catch(() => null);
    if (!response.ok) {
      return refusal(answer, response.status, init);
    }
    return answer as T;
  } catch (error) {
    return { problem: `mod.io couldn't be reached (${errorMessage(error)})` };
  }
}

// nothing, once mod.io has done what it was asked, or why it didn't
function withoutBody(answer: Answer<unknown>): Answer<object> {
  if (isProblem(answer)) {
    return answer;
  }
  return {};
}

export interface SignIn {
  token: string;   // signs requests in as the player
  expires: number; // when it runs out, in seconds since 1970
}

// posts fields as a form, with the game's api key, to one of mod.io's sign-in steps
function askSignIn<T>(
  step: string,
  fields: Record<string, string>,
  fetchUrl: Fetch,
): Promise<Answer<T>> {
  return askModio<T>(fetchUrl, `${MODIO_GAME.apiUrl}/oauth/${step}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", ...JSON_ACCEPTED },
    body: new URLSearchParams({ api_key: MODIO_GAME.apiKey, ...fields }).toString(),
  });
}

export async function emailSignInCode(
  email: string,
  fetchUrl: Fetch = fetch,
): Promise<Answer<object>> {
  return withoutBody(await askSignIn("emailrequest", { email }, fetchUrl));
}

type SignInAnswer = { access_token: string; date_expires: number };

export async function signInWithCode(
  code: string,
  fetchUrl: Fetch = fetch,
): Promise<Answer<SignIn>> {
  const fields = { security_code: code };
  const answer = await askSignIn<SignInAnswer>("emailexchange", fields, fetchUrl);
  if (isProblem(answer)) {
    return answer;
  }
  const { access_token, date_expires } = answer;
  return { token: access_token, expires: date_expires };
}

const logoFile = (logo: Uint8Array) =>
  new File([logo], "logo.png", { type: "image/png" });

function newLevelForm({ name, summary, folder, logo }: NewLevel): FormData {
  const form = new FormData();
  form.append("name", name);
  form.append("summary", summary);
  form.append("metadata_blob", folder);
  form.append("tags[]", LEVEL_TAG);
  form.append("logo", logoFile(logo));
  return form;
}

// adds a level as a new mod of the game, signed in with the player's token
export async function addLevelMod(
  token: string,
  level: NewLevel,
  fetchUrl: Fetch = fetch,
): Promise<Answer<LevelMod>> {
  const answer = await askModio<ModAnswer>(fetchUrl, gameUrl("/mods"), {
    method: "POST",
    headers: signedInHeaders(token),
    body: newLevelForm(level),
  });
  if (isProblem(answer)) {
    return answer;
  }
  const { id, profile_url } = answer;
  return { id, page: profile_url };
}

// the mod the player, signed in with their token, added for the level in
// level_src/<folder>, or null if they haven't
export async function findOwnLevelMod(
  token: string,
  folder: string,
  fetchUrl: Fetch = fetch,
): Promise<Answer<LevelMod | null>> {
  const query = new URLSearchParams({
    game_id: String(MODIO_GAME.gameId),
    metadata_blob: folder,
  });
  const url = `${MODIO_GAME.apiUrl}/me/mods?${query}`;
  const answer = await askModio<{ data: ModAnswer[] }>(fetchUrl, url, {
    headers: signedInHeaders(token),
  });
  if (isProblem(answer)) {
    return answer;
  }
  const mods = answer.data;
  const mod = mods.find((candidate) => candidate.metadata_blob === folder);
  if (!mod) {
    return null;
  }
  return { id: mod.id, page: mod.profile_url };
}

// posts file as a form's field to one of the game's paths, signed in with the
// player's token
async function postSignedInFile(
  token: string,
  path: string,
  field: string,
  file: File,
  fetchUrl: Fetch,
): Promise<Answer<object>> {
  const form = new FormData();
  form.append(field, file);
  const request = { method: "POST", headers: signedInHeaders(token), body: form };
  return withoutBody(await askModio(fetchUrl, gameUrl(path), request));
}

export function setLevelLogo(
  token: string,
  modId: number,
  logo: Uint8Array,
  fetchUrl: Fetch = fetch,
): Promise<Answer<object>> {
  const file = logoFile(logo);
  return postSignedInFile(token, `/mods/${modId}/media`, "logo", file, fetchUrl);
}

export function addLevelFile(
  token: string,
  modId: number,
  zip: Uint8Array,
  fetchUrl: Fetch = fetch,
): Promise<Answer<object>> {
  const file = new File([zip], "level.zip", { type: "application/zip" });
  return postSignedInFile(token, `/mods/${modId}/files`, "filedata", file, fetchUrl);
}

// a level players can download
export interface OnlineLevel {
  id: number;
  name: string;
  author: string;
  page: string;    // its page on mod.io
  fileUrl: string; // its newest zip
}

type OnlineModAnswer = {
  id: number;
  name: string;
  submitted_by: { username: string };
  profile_url: string;
  modfile: { download: { binary_url: string } } | null;
};

// the level a mod is, or null if it has no file to download yet
function onlineLevelOf(mod: OnlineModAnswer): OnlineLevel | null {
  if (!mod.modfile) {
    return null;
  }
  return {
    id: mod.id,
    name: mod.name,
    author: mod.submitted_by.username,
    page: mod.profile_url,
    fileUrl: mod.modfile.download.binary_url,
  };
}

const publicUrl = (path: string) =>
  `${gameUrl(path)}?${new URLSearchParams({ api_key: MODIO_GAME.apiKey })}`;

// the game's levels with a file to download: all its mods, as a level
// uploaded by hand may not be tagged
export async function listOnlineLevels(
  fetchUrl: Fetch = fetch,
): Promise<Answer<OnlineLevel[]>> {
  const url = publicUrl("/mods");
  const answer = await askModio<{ data: OnlineModAnswer[] }>(fetchUrl, url, {
    headers: JSON_ACCEPTED,
  });
  if (isProblem(answer)) {
    return answer;
  }
  const levels = answer.data.map(onlineLevelOf);
  return levels.filter((level): level is OnlineLevel => level !== null);
}

export async function fetchOnlineLevel(
  modId: number,
  fetchUrl: Fetch = fetch,
): Promise<Answer<OnlineLevel>> {
  const url = publicUrl(`/mods/${modId}`);
  const mod = await askModio<OnlineModAnswer>(fetchUrl, url, { headers: JSON_ACCEPTED });
  if (isProblem(mod)) {
    return mod;
  }
  const level = onlineLevelOf(mod);
  if (!level) {
    return { problem: `${mod.name} has no file on mod.io yet.` };
  }
  return level;
}

