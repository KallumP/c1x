// the level editor's mod.io api, for sharing a level from the editor. paths are
// after /api/modio:
//   GET  /account               whether the player is signed in ({ signedIn })
//   POST /email                 has mod.io email the player a code ({ email })
//   POST /code                  signs in with it ({ code }), keeping the token in
//                               modio_token.json
//   POST /sign-out              forgets the token
//   GET  /levels/<name>         the player's mod for the level, if they have one
//                               ({ online })
//   POST /levels/<name>/upload  uploads it ({ summary, logo: a base64 png, or null to
//                               keep the picture it has }), as an Uploaded
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { levelOptions } from "../builder/levelCfg";
import { uploadLevel } from "../scripts/levelUpload";
import {
  emailSignInCode,
  findOwnLevelMod,
  isProblem,
  signInWithCode,
  type Answer,
  type SignIn,
} from "../scripts/modio";
import type { ApiResponse } from "./api";
import { listLevels } from "./levels";
import { errorMessage } from "../src/errorMessage";

type ReadBody = () => Promise<string>;

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
const NOT_FOUND: ApiResponse = { status: 404, type: "text/plain", body: "not found" };
const NOT_SIGNED_IN: ApiResponse = {
  status: 401,
  type: "text/plain",
  body: "Sign in to mod.io first.",
};
const json = (value: unknown): ApiResponse => ({
  status: 200,
  type: "application/json",
  body: JSON.stringify(value),
});
const refused = (problem: string): ApiResponse => ({
  status: 400,
  type: "text/plain",
  body: problem,
});

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

// the player's token, if they've signed in and it hasn't run out
function signedInToken(repo: string, now: number): string | null {
  if (!existsSync(tokenPath(repo))) {
    return null;
  }
  const { token, expires } = JSON.parse(readFileSync(tokenPath(repo), "utf8")) as SignIn;
  if (expires <= now) {
    return null;
  }
  return token;
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

// a base64 logo's bytes, or null for none: keep the picture the level has
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
  const root = join(repo, "level_src");
  const { summary, logo } = JSON.parse(await readBody());
  const details = {
    name: levelOptions(join(root, name)).title,
    summary: String(summary),
    logo: logoBytes(logo),
  };
  return answeredSignedIn(repo, await calls.uploadLevel(token, root, name, details));
}

async function levelResponse(
  repo: string,
  method: string,
  parts: string[],
  readBody: ReadBody,
  calls: ModioCalls,
): Promise<ApiResponse> {
  const root = join(repo, "level_src");
  const [name, action] = parts;
  if (!listLevels(root).some((level) => level.name === name)) {
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
// /api/modio, and its body when it's needed; a request it can't do is a 400 saying why
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
