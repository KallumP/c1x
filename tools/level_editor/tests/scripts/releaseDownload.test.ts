import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { strToU8, zipSync } from "fflate";
import {
  downloadReleaseCommand,
  RELEASE_INSTALLED_PREFIX,
  releaseZipUrl,
} from "../../scripts/releaseDownload";

describe("a release's zip", () => {
  test("downloads from its release on GitHub, tagged with a v", () => {
    expect(releaseZipUrl("1.5")).toBe(
      "https://github.com/KallumP/c1x/releases/download/v1.5/c1x-1.5.zip",
    );
  });
});

describe("downloading a release", () => {
  let games: string; // a stand-in for the folder the player's c1x folder is in
  let current: string; // the player's c1x folder, the tools' repo

  beforeEach(() => {
    games = mkdtempSync(join(tmpdir(), "games-"));
    current = join(games, "c1x-1.4");
    mkdirSync(current);
  });
  afterEach(() => { rmSync(games, { recursive: true, force: true }); });

  const ZIP = zipSync({ "c1x-1.5/c1x_launcher.exe": strToU8("launcher") });
  const newFolder = () => join(games, "c1x-1.5");

  // runs the command for version, the download answering with answer; its exit
  // code, what it said, and the urls it asked for
  async function downloaded(
    version: string,
    answer: Uint8Array | { problem: string } = ZIP,
  ) {
    const said: string[] = [];
    const asked: string[] = [];
    const downloadFile = async (url: string) => {
      asked.push(url);
      return answer;
    };
    const say = (line: string) => said.push(line);
    const exitCode = await downloadReleaseCommand(version, current, say, downloadFile);
    return { exitCode, said, asked };
  }

  test("downloads the version's zip from GitHub", async () => {
    expect((await downloaded("1.5")).asked).toEqual([releaseZipUrl("1.5")]);
  });

  test("unzips it beside the player's folder", async () => {
    await downloaded("1.5");
    expect(readFileSync(join(newFolder(), "c1x_launcher.exe"), "utf8")).toBe("launcher");
  });

  test("copies the player's things into it", async () => {
    writeFileSync(join(current, "settings.cfg"), "mine");
    await downloaded("1.5");
    expect(readFileSync(join(newFolder(), "settings.cfg"), "utf8")).toBe("mine");
  });

  test("says where the new folder is, and works", async () => {
    expect(await downloaded("1.5")).toMatchObject({
      exitCode: 0,
      said: [`${RELEASE_INSTALLED_PREFIX}${newFolder()}`],
    });
  });

  test("downloads nothing for what isn't a version, saying so", async () => {
    expect(await downloaded("latest")).toEqual({
      exitCode: 1,
      said: ['"latest" isn\'t a version: it has to be two numbers, like 1.5'],
      asked: [],
    });
  });

  test("says why it couldn't download it, and fails", async () => {
    const refused = await downloaded("1.5", { problem: "the download answered 404" });
    expect(refused).toMatchObject({
      exitCode: 1,
      said: ["couldn't download c1x 1.5: the download answered 404"],
    });
  });

  test("says why it couldn't unzip it, and fails", async () => {
    mkdirSync(newFolder());
    expect(await downloaded("1.5")).toMatchObject({
      exitCode: 1,
      said: [
        `couldn't install c1x 1.5: ${newFolder()} is already there: delete or rename it first.`,
      ],
    });
  });
});

describe("what the launcher reads", () => {
  test("starts as the launcher's code says it does", () => {
    const codeUrl = new URL(
      "../../../../src/launcher/release_download.c",
      import.meta.url,
    );
    const launcherCode = readFileSync(fileURLToPath(codeUrl), "utf8");
    const launchersPrefix = /#define INSTALLED_PREFIX "(.*)"/.exec(launcherCode)?.[1];
    expect(launchersPrefix).toBe(RELEASE_INSTALLED_PREFIX);
  });
});
