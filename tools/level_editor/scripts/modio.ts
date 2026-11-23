// mod.io's api, where custom levels are shared (see doc/custom_levels.md): each
// level is a mod of c1x's game there, its file a zip of the level's source folder

// fetch, or a test's stand-in for it
export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;
// what mod.io answered, or why there's no answer
export type Answer<T> = T | { problem: string };

// c1x's game on mod.io. the api key only reads what's public, so it ships with
// the game, as mod.io means it to. it's the test site's game for now
export const MODIO_GAME = {
  apiUrl: "https://g-1414.test.mod.io/v1",
  gameId: 1414,
  apiKey: "f4f1565165a835697fb9ca26cf0e1030",
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

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
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

function newLevelForm({ name, summary, folder, logo }: NewLevel): FormData {
  const form = new FormData();
  form.append("name", name);
  form.append("summary", summary);
  form.append("metadata_blob", folder);
  form.append("tags[]", LEVEL_TAG);
  form.append("logo", new File([logo], "logo.png", { type: "image/png" }));
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
