import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { modioApi, type ModioCalls } from "../../server/modioApi";
import type { LevelDetails } from "../../scripts/levelUpload";
import type { LevelMod } from "../../scripts/modio";

let repo: string;

// a repo whose level_src has one level source, 1_tide_ruins
beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), "editor-modio-api-"));
  mkdirSync(join(repo, "level_src", "1_tide_ruins"), { recursive: true });
  writeFileSync(join(repo, "level_src", "1_tide_ruins", "tide_ruins.obj"), "o Floor\n");
});
afterEach(() => { rmSync(repo, { recursive: true, force: true }); });

const NOW = 1700000000; // seconds since 1970
const LATER = NOW + 1000;
const ONLINE: LevelMod = { id: 17302, page: "https://test.mod.io/m/tide-ruins" };
const tokenPath = () => join(repo, "modio_token.json");
const signIn = (expires = LATER) => writeFileSync(tokenPath(), JSON.stringify({ token: "token", expires }));

// stand-ins for mod.io, answering as given, and what they were sent
function standInCalls(answers: Partial<{ problem: string; own: LevelMod | null }> = {}) {
  const sent = {
    emails: [] as string[],
    codes: [] as string[],
    uploads: [] as { token: string; name: string; details: LevelDetails }[],
  };
  const answer = <T>(value: T) => {
    if (answers.problem) {
      return { problem: answers.problem };
    }
    return value;
  };
  const calls: ModioCalls = {
    emailSignInCode: async (email) => { sent.emails.push(email); return answer({}); },
    signInWithCode: async (code) => { sent.codes.push(code); return answer({ token: "new token", expires: LATER }); },
    findOwnLevelMod: async () => answer(answers.own ?? null),
    uploadLevel: async (token, _root, name, details) => {
      sent.uploads.push({ token, name, details });
      return answer({ mod: ONLINE, isNew: true });
    },
    now: () => NOW,
  };
  return { calls, sent };
}

// a request to the api: its method, its path after /api/modio, and its body
function request(method: string, path: string, body: unknown = {}, calls = standInCalls().calls) {
  return modioApi(repo, method, path, async () => JSON.stringify(body), calls);
}
const json = (body: string | Buffer) => JSON.parse(body.toString());

describe("the editor's mod.io account", () => {
  test("isn't signed in without a token", async () => {
    expect(json((await request("GET", "/account")).body)).toEqual({ signedIn: false });
  });

  test("is signed in with a token that hasn't run out", async () => {
    signIn();
    expect(json((await request("GET", "/account")).body)).toEqual({ signedIn: true });
  });

  test("isn't signed in with a token that's run out", async () => {
    signIn(NOW);
    expect(json((await request("GET", "/account")).body)).toEqual({ signedIn: false });
  });

  test("POST /email has mod.io email the code", async () => {
    const { calls, sent } = standInCalls();
    expect((await request("POST", "/email", { email: "me@example.com" }, calls)).status).toBe(200);
    expect(sent.emails).toEqual(["me@example.com"]);
  });

  test("POST /code signs in, keeping the token", async () => {
    const { calls, sent } = standInCalls();
    expect(json((await request("POST", "/code", { code: "AB12C" }, calls)).body)).toEqual({ signedIn: true });
    expect(sent.codes).toEqual(["AB12C"]);
    expect(JSON.parse(readFileSync(tokenPath(), "utf8"))).toEqual({ token: "new token", expires: LATER });
  });

  test("POST /sign-out forgets the token", async () => {
    signIn();
    await request("POST", "/sign-out");
    expect(existsSync(tokenPath())).toBe(false);
  });

  test("mod.io's refusal is a 400 saying why", async () => {
    const { calls } = standInCalls({ problem: "The security code is invalid." });
    const response = await request("POST", "/code", { code: "WRONG" }, calls);
    expect([response.status, response.body.toString()]).toEqual([400, "The security code is invalid."]);
  });
});

describe("a level on mod.io", () => {
  test("GET /levels/<name> is the player's mod for it", async () => {
    signIn();
    const { calls } = standInCalls({ own: ONLINE });
    expect(json((await request("GET", "/levels/1_tide_ruins", {}, calls)).body)).toEqual({ online: ONLINE });
  });

  test("GET /levels/<name> is none when it isn't online", async () => {
    signIn();
    expect(json((await request("GET", "/levels/1_tide_ruins")).body)).toEqual({ online: null });
  });

  test("POST /levels/<name>/upload uploads it as the player, titled by its folder's name", async () => {
    signIn();
    const { calls, sent } = standInCalls();
    await request("POST", "/levels/1_tide_ruins/upload", { summary: "A beach.", logo: "AQID" }, calls);
    expect(sent.uploads).toEqual([{
      token: "token",
      name: "1_tide_ruins",
      details: { name: "Tide Ruins", summary: "A beach.", logo: new Uint8Array([1, 2, 3]) },
    }]);
  });

  test("POST /levels/<name>/upload titles it as its level.cfg does", async () => {
    signIn();
    writeFileSync(join(repo, "level_src", "1_tide_ruins", "level.cfg"), "title = Sunken Steps\n");
    const { calls, sent } = standInCalls();
    await request("POST", "/levels/1_tide_ruins/upload", { summary: "A beach.", logo: "AQID" }, calls);
    expect(sent.uploads[0].details.name).toBe("Sunken Steps");
  });

  test("POST /levels/<name>/upload without a logo keeps its picture", async () => {
    signIn();
    const { calls, sent } = standInCalls();
    await request("POST", "/levels/1_tide_ruins/upload", { summary: "", logo: null }, calls);
    expect(sent.uploads[0].details.logo).toBeNull();
  });

  test("POST /levels/<name>/upload is the uploaded mod", async () => {
    signIn();
    const response = await request("POST", "/levels/1_tide_ruins/upload", { summary: "A beach.", logo: "AQID" });
    expect(json(response.body)).toEqual({ mod: ONLINE, isNew: true });
  });

  test("needs the player signed in", async () => {
    const response = await request("POST", "/levels/1_tide_ruins/upload", { summary: "A beach.", logo: "AQID" });
    expect([response.status, response.body.toString()]).toEqual([401, "Sign in to mod.io first."]);
  });

  test("a level that isn't in level_src is not found", async () => {
    signIn();
    expect((await request("GET", "/levels/nope")).status).toBe(404);
  });
});
