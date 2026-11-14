import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { levelsApi } from "../../server/api";

let repo: string;

// a repo whose level_src has one level source, cave
beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), "editor-api-"));
  mkdirSync(join(repo, "level_src", "cave"), { recursive: true });
  writeFileSync(join(repo, "level_src", "cave", "cave.obj"), "o Floor\n");
});
afterEach(() => { rmSync(repo, { recursive: true, force: true }); });

// a request to the api: its method, its path after /api/levels, and its body
const request = (method: string, path: string, body = "") => levelsApi(repo, method, path, async () => body);
const text = (body: string | Buffer) => body.toString();

describe("the level editor's api", () => {
  test("GET / lists the level sources", async () => {
    const response = await request("GET", "/");
    expect(response.status).toBe(200);
    expect(response.type).toBe("application/json");
    expect(JSON.parse(text(response.body)).map(({ name }: { name: string }) => name)).toEqual(["cave"]);
  });

  test("GET /<name>/files/<file> gives a file in its folder, by its type", async () => {
    const response = await request("GET", "/cave/files/cave.obj");
    expect(response).toMatchObject({ status: 200, type: "text/plain" });
    expect(text(response.body)).toBe("o Floor\n");
  });

  test("a file that isn't there is not found", async () => {
    expect((await request("GET", "/cave/files/nope.png")).status).toBe(404);
  });

  test("names in the path are url decoded", async () => {
    writeFileSync(join(repo, "level_src", "cave", "my song.mp3"), "song");
    expect((await request("GET", "/cave/files/my%20song.mp3")).status).toBe(200);
  });

  test("GET /<name>/objects is its objects.json, and PUT saves it", async () => {
    expect(text((await request("GET", "/cave/objects")).body)).toBe("[]\n");
    expect((await request("PUT", "/cave/objects", '[{"kind": "spawn", "at": [0, 0, 0]}]')).status).toBe(200);
    expect(readFileSync(join(repo, "level_src", "cave", "objects.json"), "utf8")).toBe('[{"kind": "spawn", "at": [0, 0, 0]}]');
  });

  test("objects that aren't json are refused, with why", async () => {
    const response = await request("PUT", "/cave/objects", "[{");
    expect(response.status).toBe(400);
    expect(text(response.body)).toMatch(/JSON/);
  });

  test("GET /<name>/cfg is its level.cfg's settings, and PUT sets them", async () => {
    expect(JSON.parse(text((await request("GET", "/cave/cfg")).body))).toMatchObject({ turn: 0, scale: 400 });
    expect((await request("PUT", "/cave/cfg", JSON.stringify({ turn: 90, scale: 800 }))).status).toBe(200);
    expect(readFileSync(join(repo, "level_src", "cave", "level.cfg"), "utf8")).toMatch(/turn = 90\nscale = 800/);
  });

  test("POST /<name>/boot sets settings.cfg to boot into it", async () => {
    expect((await request("POST", "/cave/boot")).status).toBe(200);
    expect(readFileSync(join(repo, "settings.cfg"), "utf8")).toMatch(/^boot_level = cave$/m);
  });

  test("POST /<name>/build builds it, saying how it went", async () => {
    // without the game's files in streams/ there's nothing to build from
    const response = await request("POST", "/cave/build");
    expect(response.status).toBe(200);
    expect(JSON.parse(text(response.body))).toMatchObject({ ok: false, output: expect.stringMatching(/isn't in/) });
  });

  test("a level source that isn't there is refused", async () => {
    expect((await request("POST", "/nope/build")).status).toBe(400);
  });

  test("anything else is not found", async () => {
    expect((await request("DELETE", "/cave/objects")).status).toBe(404);
    expect((await request("GET", "/cave/nothing")).status).toBe(404);
  });
});
