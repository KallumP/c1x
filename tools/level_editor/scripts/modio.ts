// mod.io's api, where custom levels are shared (see doc/custom_levels.md): each
// level is a mod of c1x's game there, its file a zip of the level's source folder
import { errorMessage } from "../src/errorMessage";

// fetch, or a test's stand-in for it
export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;
// what mod.io answered, or why there's no answer
export type Answer<T> = T | { problem: string };

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

const gameUrl = (path: string) => `${MODIO_GAME.apiUrl}/games/${MODIO_GAME.gameId}${path}`;
const signedIn = (token: string) => ({ Authorization: `Bearer ${token}`, Accept: "application/json" });

// mod.io's message in a refusal, with what it says is wrong with each field
function refusalReason(answer: unknown, status: number): string {
  const error = (answer as { error?: { message?: string; errors?: Record<string, string> } } | null)?.error;
  if (!error?.message) {
    return `mod.io answered ${status}`;
  }
  return [error.message, ...Object.values(error.errors ?? {})].join(" ");
}

// mod.io's answer to a request, or why there isn't one
async function askModio(fetchUrl: Fetch, url: string, init: RequestInit): Promise<Answer<unknown>> {
  try {
    const response = await fetchUrl(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    const answer = await response.json().catch(() => null);
    if (!response.ok) {
      return { problem: refusalReason(answer, response.status) };
    }
    return answer;
  } catch (error) {
    return { problem: `mod.io couldn't be reached (${errorMessage(error)})` };
  }
}

export const isProblem = <T>(answer: Answer<T>): answer is { problem: string } =>
  typeof answer === "object" && answer !== null && "problem" in answer;

export interface SignIn {
  token: string;   // signs requests in as the player
  expires: number; // when it runs out, in seconds since 1970
}

// posts fields as a form, with the game's api key, to one of mod.io's sign-in steps
function askSignIn(step: string, fields: Record<string, string>, fetchUrl: Fetch): Promise<Answer<unknown>> {
  return askModio(fetchUrl, `${MODIO_GAME.apiUrl}/oauth/${step}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ api_key: MODIO_GAME.apiKey, ...fields }).toString(),
  });
}

// has mod.io email the player a code to sign in with
export async function sendSignInCode(email: string, fetchUrl: Fetch = fetch): Promise<Answer<object>> {
  const answer = await askSignIn("emailrequest", { email }, fetchUrl);
  if (isProblem(answer)) {
    return answer;
  }
  return {};
}

// signs the player in with the code mod.io emailed them
export async function signInWithCode(code: string, fetchUrl: Fetch = fetch): Promise<Answer<SignIn>> {
  const answer = await askSignIn("emailexchange", { security_code: code }, fetchUrl);
  if (isProblem(answer)) {
    return answer;
  }
  const { access_token, date_expires } = answer as { access_token: string; date_expires: number };
  return { token: access_token, expires: date_expires };
}

const logoFile = (logo: Uint8Array) => new File([logo], "logo.png", { type: "image/png" });

function newLevelForm({ name, summary, folder, logo }: NewLevel): FormData {
  const form = new FormData();
  form.append("name", name);
  form.append("summary", summary);
  form.append("metadata_blob", folder);
  form.append("tags[]", LEVEL_TAG);
  form.append("logo", logoFile(logo));
  return form;
}

// adds a level as a new mod of the game, as the player token signs in as
export async function addLevelMod(
  token: string,
  level: NewLevel,
  fetchUrl: Fetch = fetch,
): Promise<Answer<LevelMod>> {
  const answer = await askModio(fetchUrl, gameUrl("/mods"), {
    method: "POST",
    headers: signedIn(token),
    body: newLevelForm(level),
  });
  if (isProblem(answer)) {
    return answer;
  }
  const { id, profile_url } = answer as ModAnswer;
  return { id, page: profile_url };
}

// the mod the player token signs in as added for the level in level_src/<folder>, or null if they haven't
export async function findOwnLevelMod(
  token: string,
  folder: string,
  fetchUrl: Fetch = fetch,
): Promise<Answer<LevelMod | null>> {
  const query = new URLSearchParams({ game_id: String(MODIO_GAME.gameId), metadata_blob: folder });
  const url = `${MODIO_GAME.apiUrl}/me/mods?${query}`;
  const answer = await askModio(fetchUrl, url, { headers: signedIn(token) });
  if (isProblem(answer)) {
    return answer;
  }
  const mods = (answer as { data: ModAnswer[] }).data;
  const mod = mods.find((candidate) => candidate.metadata_blob === folder);
  if (!mod) {
    return null;
  }
  return { id: mod.id, page: mod.profile_url };
}

// sets logo as the picture of the level mod modId
export async function setLevelLogo(
  token: string,
  modId: number,
  logo: Uint8Array,
  fetchUrl: Fetch = fetch,
): Promise<Answer<object>> {
  const form = new FormData();
  form.append("logo", logoFile(logo));
  const answer = await askModio(fetchUrl, gameUrl(`/mods/${modId}/media`), {
    method: "POST",
    headers: signedIn(token),
    body: form,
  });
  if (isProblem(answer)) {
    return answer;
  }
  return {};
}

// adds zip as the newest file of the level mod modId
export async function addLevelFile(
  token: string,
  modId: number,
  zip: Uint8Array,
  fetchUrl: Fetch = fetch,
): Promise<Answer<object>> {
  const form = new FormData();
  form.append("filedata", new File([zip], "level.zip", { type: "application/zip" }));
  const answer = await askModio(fetchUrl, gameUrl(`/mods/${modId}/files`), {
    method: "POST",
    headers: signedIn(token),
    body: form,
  });
  if (isProblem(answer)) {
    return answer;
  }
  return {};
}

// a level players can download
export interface OnlineLevel {
  id: number;
  name: string;
  author: string;
  folder: string;  // its folder in level_src/, as its uploader had it
  fileUrl: string; // its newest zip
}

type OnlineModAnswer = {
  id: number;
  name: string;
  metadata_blob: string | null; // null for a level uploaded by hand
  submitted_by: { username: string };
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
    folder: mod.metadata_blob ?? "",
    fileUrl: mod.modfile.download.binary_url,
  };
}

const JSON_ACCEPTED = { Accept: "application/json" };

const publicUrl = (path: string, query: Record<string, string> = {}) =>
  `${gameUrl(path)}?${new URLSearchParams({ api_key: MODIO_GAME.apiKey, ...query })}`;

// the game's levels with a file to download: all its mods, as a level
// uploaded by hand may not be tagged
export async function listOnlineLevels(fetchUrl: Fetch = fetch): Promise<Answer<OnlineLevel[]>> {
  const answer = await askModio(fetchUrl, publicUrl("/mods"), { headers: JSON_ACCEPTED });
  if (isProblem(answer)) {
    return answer;
  }
  const mods = (answer as { data: OnlineModAnswer[] }).data;
  return mods.map(onlineLevelOf).filter((level): level is OnlineLevel => level !== null);
}

// the level mod modId is
export async function onlineLevel(modId: number, fetchUrl: Fetch = fetch): Promise<Answer<OnlineLevel>> {
  const answer = await askModio(fetchUrl, publicUrl(`/mods/${modId}`), { headers: JSON_ACCEPTED });
  if (isProblem(answer)) {
    return answer;
  }
  const mod = answer as OnlineModAnswer;
  const level = onlineLevelOf(mod);
  if (!level) {
    return { problem: `${mod.name} has no file on mod.io yet.` };
  }
  return level;
}

// the zip at a level's file url
export async function downloadLevelZip(fileUrl: string, fetchUrl: Fetch = fetch): Promise<Answer<Uint8Array>> {
  try {
    const response = await fetchUrl(fileUrl, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) {
      return { problem: `the download answered ${response.status}` };
    }
    return new Uint8Array(await response.arrayBuffer());
  } catch (error) {
    return { problem: `the download failed (${errorMessage(error)})` };
  }
}
