// the level editor's mod.io api, for sharing a level from the editor. paths are
// after /api/modio:
//   GET  /account               whether the player is signed in ({ signedIn })
//   POST /email                 has mod.io email the player a code ({ email })
//   POST /code                  signs in with it ({ code }), keeping the token in
//                               modio_token.json
//   POST /sign-out              forgets the token
//   GET  /levels/<name>         the player's mod for the level, if they have one
//                               ({ online })
//   POST /levels/<name>/upload  uploads it ({ logo: a base64 png, or null for none,
//                               which a new version doesn't need }), as an Uploaded
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { levelOptions } from "../builder/levelCfg";
import { repoFolders } from "../builder/repoFolders";
import { uploadLevel } from "../scripts/levelUpload";
import { isProblem, type Answer } from "../scripts/answer";
import {
  emailSignInCode,
  findOwnLevelMod,
  signInWithCode,
  type SignIn,
} from "../scripts/modio";
import { json, NOT_FOUND, refused, type ApiResponse, type ReadBody } from "./api";
import { hasLevelSource } from "./levels";
import { errorMessage } from "../src/errorMessage";

// mod.io's calls and the clock, or a test's stand-ins for them
export interface ModioCalls {
  emailSignInCode: typeof emailSignInCode;
  signInWithCode: typeof signInWithCode;
  findOwnLevelMod: typeof findOwnLevelMod;
  uploadLevel: typeof uploadLevel;
  now: () => number; // seconds since 1970
}

const MODIO_CALLS: ModioCalls = {
  emailSignInCode,
  signInWithCode,
  findOwnLevelMod,
  uploadLevel,
  now: () => Date.now() / 1000,
};

const TOKEN_FILE = "modio_token.json";
const NOT_SIGNED_IN: ApiResponse = {
  status: 401,
  type: "text/plain",
  body: "Sign in to mod.io first.",
};

// mod.io's answer as json, or a 400 saying why it refused
function answered<T>(
  answer: Answer<T>,
  toBody: (value: T) => unknown = (value) => value,
): ApiResponse {
  if (isProblem(answer)) {
    return refused(answer.problem);
  }
  return json(toBody(answer));
}

const tokenPath = (repo: string) => join(repo, TOKEN_FILE);
const forgetToken = (repo: string) => rmSync(tokenPath(repo), { force: true });

// mod.io's answer to a request signed in as the player, as answered gives it, or
// signed out, the token forgotten, when mod.io refused the token
function answeredSignedIn<T>(
  repo: string,
  answer: Answer<T>,
  toBody?: (value: T) => unknown,
): ApiResponse {
  if (isProblem(answer) && answer.signedOut) {
    forgetToken(repo);
    return NOT_SIGNED_IN;
  }
  return answered(answer, toBody);
}

// the sign-in kept in the token file, or null if there isn't one it can read
function savedSignIn(repo: string): SignIn | null {
  if (!existsSync(tokenPath(repo))) {
    return null;
  }
  try {
    return signInIn(JSON.parse(readFileSync(tokenPath(repo), "utf8")));
  } catch {
    return null;
  }
}

// the sign-in a token file's json holds, or null if it's missing its token or expiry
function signInIn(saved: unknown): SignIn | null {
  const { token, expires } = (saved ?? {}) as Partial<Record<keyof SignIn, unknown>>;
  if (typeof token !== "string" || typeof expires !== "number") {
    return null;
  }
  return { token, expires };
}

// the player's token, if they've signed in and it hasn't run out
function signedInToken(repo: string, now: number): string | null {
  const signIn = savedSignIn(repo);
  if (!signIn || signIn.expires <= now) {
    return null;
  }
  return signIn.token;
}

async function signInWithBody(
  repo: string,
  readBody: ReadBody,
  calls: ModioCalls,
): Promise<ApiResponse> {
  const { code } = JSON.parse(await readBody());
  const signIn = await calls.signInWithCode(String(code));
  if (isProblem(signIn)) {
    return refused(signIn.problem);
  }
  writeFileSync(tokenPath(repo), JSON.stringify(signIn));
  return json({ signedIn: true });
}

async function accountResponse(
  repo: string,
  method: string,
  step: string,
  readBody: ReadBody,
  calls: ModioCalls,
): Promise<ApiResponse> {
  if (method === "GET" && step === "account") {
    return json({ signedIn: signedInToken(repo, calls.now()) !== null });
  }
  if (method === "POST" && step === "email") {
    const { email } = JSON.parse(await readBody());
    return answered(await calls.emailSignInCode(String(email)));
  }
  if (method === "POST" && step === "code") {
    return signInWithBody(repo, readBody, calls);
  }
  if (method === "POST" && step === "sign-out") {
    forgetToken(repo);
    return json({});
  }
  return NOT_FOUND;
}

// a base64 logo's bytes, or null for none
function logoBytes(logo: unknown): Uint8Array | null {
  if (typeof logo !== "string" || logo === "") {
    return null;
  }
  return new Uint8Array(Buffer.from(logo, "base64"));
}

async function uploadWithBody(
  repo: string,
  name: string,
  token: string,
  readBody: ReadBody,
  calls: ModioCalls,
): Promise<ApiResponse> {
  const root = repoFolders(repo).sourcesDir;
  const { logo } = JSON.parse(await readBody());
  const details = { name: levelOptions(join(root, name)).title, logo: logoBytes(logo) };
  return answeredSignedIn(repo, await calls.uploadLevel(token, root, name, details));
}

async function levelResponse(
  repo: string,
  method: string,
  parts: string[],
  readBody: ReadBody,
  calls: ModioCalls,
): Promise<ApiResponse> {
  const [name, action] = parts;
  if (!hasLevelSource(repoFolders(repo).sourcesDir, name)) {
    return NOT_FOUND;
  }
  const token = signedInToken(repo, calls.now());
  if (!token) {
    return NOT_SIGNED_IN;
  }
  if (method === "GET" && parts.length === 1) {
    const own = await calls.findOwnLevelMod(token, name);
    return answeredSignedIn(repo, own, (online) => ({ online }));
  }
  if (method === "POST" && action === "upload" && parts.length === 2) {
    return uploadWithBody(repo, name, token, readBody, calls);
  }
  return NOT_FOUND;
}

// answers a request to the mod.io api in repo: its method, its path after
// /api/modio, and its body when it's needed. a request that fails is a 400 saying
// why, one for a path it doesn't have a 404, and one needing a sign-in without one a 401
export async function modioApi(
  repo: string,
  method: string,
  path: string,
  readBody: ReadBody,
  calls: ModioCalls = MODIO_CALLS,
): Promise<ApiResponse> {
  const parts = decodeURIComponent(path.split("?")[0]).split("/").filter(Boolean);
  try {
    if (parts[0] === "levels") {
      return await levelResponse(repo, method, parts.slice(1), readBody, calls);
    }
    if (parts.length === 1) {
      return await accountResponse(repo, method, parts[0], readBody, calls);
    }
    return NOT_FOUND;
  } catch (error) {
    return refused(errorMessage(error));
  }
}
