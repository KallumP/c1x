import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strToU8, zipSync } from "fflate";
import { downloadLevelCommand, type DownloadCalls } from "../../scripts/levelDownload";
import type { OnlineLevel } from "../../scripts/modio";

let root: string; // a stand-in for level_src/

beforeEach(() => { root = mkdtempSync(join(tmpdir(), "level_src-")); });
afterEach(() => { rmSync(root, { recursive: true, force: true }); });

const TIDE_RUINS: OnlineLevel = {
  id: 17302,
  name: "Tide Ruins",
  author: "kallum",
  page: "https://mod.io/g/crash-1-n-hanced/m/tide-ruins",
  fileUrl: "https://mod.io/files/tide.zip",
};
const ZIP = zipSync({ "1_tide_ruins/tide_ruins.obj": strToU8("o Floor\n") });

// stand-ins for mod.io and the build, answering as given, and what they were asked
type StandInAnswers = Partial<{
  level: { problem: string };
  zip: { problem: string };
  builds: boolean;
}>;

function standInCalls(answers: StandInAnswers = {}) {
  const asked = { ids: [] as number[], urls: [] as string[], built: [] as string[] };
  const calls: DownloadCalls = {
    fetchOnlineLevel: async (id) => {
      asked.ids.push(id);
      return answers.level ?? TIDE_RUINS;
    },
    downloadLevelZip: async (url) => {
      asked.urls.push(url);
      return answers.zip ?? ZIP;
    },
    buildLevel: (name) => {
      asked.built.push(name);
      return answers.builds ?? true;
    },
  };
  return { calls, asked };
}

async function download(calls: DownloadCalls) {
  const said: string[] = [];
  const exitCode = await downloadLevelCommand(
    root,
    17302,
    (line) => said.push(line),
    calls,
  );
  return { exitCode, said };
}

describe("downloading a level", () => {
  test("downloads the mod's newest file", async () => {
    const { calls, asked } = standInCalls();
    await download(calls);
    expect([asked.ids, asked.urls]).toEqual([[17302], [TIDE_RUINS.fileUrl]]);
  });

  test("notes its page on mod.io with it", async () => {
    await download(standInCalls().calls);
    const note = readFileSync(join(root, "1_tide_ruins", ".modio.json"), "utf8");
    expect(JSON.parse(note)).toEqual({ modId: 17302, page: TIDE_RUINS.page });
  });

  test("builds it, saying so", async () => {
    const { calls, asked } = standInCalls();
    expect(await download(calls)).toEqual({
      exitCode: 0,
      said: ["downloaded Tide Ruins into level_src/1_tide_ruins"],
    });
    expect(asked.built).toEqual(["1_tide_ruins"]);
  });

  test("fails when it doesn't build", async () => {
    expect((await download(standInCalls({ builds: false }).calls)).exitCode).toBe(1);
  });
});

describe("a level that can't be downloaded", () => {
  test("says why mod.io wouldn't give it", async () => {
    const { calls } = standInCalls({ level: { problem: "Not found." } });
    expect(await download(calls)).toEqual({
      exitCode: 1,
      said: ["couldn't download level 17302: Not found."],
    });
  });

  test("says why its file didn't download", async () => {
    const { calls } = standInCalls({ zip: { problem: "the download answered 404" } });
    expect(await download(calls)).toEqual({
      exitCode: 1,
      said: ["couldn't download level 17302: the download answered 404"],
    });
  });

  test("builds nothing when it can't be unzipped, and fails", async () => {
    const { calls, asked } = standInCalls();
    calls.downloadLevelZip = async () => new Uint8Array([1, 2, 3]);
    expect((await download(calls)).exitCode).toBe(1);
    expect(asked.built).toEqual([]);
  });
});
