import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { addressLine, startEditorServer } from "../../server/editorServer";

const FIRST_PORT = 47310; // well away from vite's 5173, so a running editor doesn't get in the way

let repo: string;
let page: string;
const servers: Server[] = [];

// a repo with one level source, and a built page beside it
beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), "editor-server-"));
  mkdirSync(join(repo, "level_src", "cave"), { recursive: true });
  writeFileSync(join(repo, "level_src", "cave", "cave.obj"), "o Floor\n");
  page = join(repo, "page");
  mkdirSync(join(page, "assets"), { recursive: true });
  writeFileSync(join(page, "index.html"), "<html>editor</html>");
  writeFileSync(join(page, "assets", "main.js"), "console.log(1)");
});
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((done) => server.close(done))));
  rmSync(repo, { recursive: true, force: true });
});

async function started(firstPort = FIRST_PORT) {
  const editor = await startEditorServer({ repo, pageDir: page, firstPort });
  servers.push(editor.server);
  return editor;
}

describe("the editor server", () => {
  test("serves the built page at its address", async () => {
    const { address } = await started();
    const response = await fetch(address);
    expect(response.headers.get("content-type")).toMatch(/^text\/html/);
    expect(await response.text()).toBe("<html>editor</html>");
  });

  test("serves the page's files by their types", async () => {
    const { address } = await started();
    const response = await fetch(`${address}assets/main.js`);
    expect(response.headers.get("content-type")).toMatch(/^text\/javascript/);
  });

  test("answers the api under /api/levels", async () => {
    const { address } = await started();
    const levels = await (await fetch(`${address}api/levels`)).json();
    expect(levels.map(({ name }: { name: string }) => name)).toEqual(["cave"]);
    expect(await (await fetch(`${address}api/levels/cave/objects`, { method: "PUT", body: "[]" })).json()).toEqual({});
  });

  test("a file that isn't part of the page is not found, even one outside it", async () => {
    const { address } = await started();
    expect((await fetch(`${address}nope.js`)).status).toBe(404);
    expect((await fetch(`${address}..%2Flevel_src%2Fcave%2Fcave.obj`)).status).toBe(404);
  });

  test("is on its first port, or the next free one", async () => {
    const taken = createServer();
    await new Promise<void>((done) => taken.listen(FIRST_PORT + 5, "localhost", done));
    servers.push(taken);
    const { address } = await started(FIRST_PORT + 5);
    expect(address).toBe(`http://localhost:${FIRST_PORT + 6}/`);
  });

  test("says where it is as vite does, for the launcher to find", () => {
    expect(addressLine("http://localhost:5173/")).toBe("  Local:   http://localhost:5173/");
  });
});
