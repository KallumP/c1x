import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  downloadReleaseCommand,
  downloadsFolder,
  RELEASE_SAVED_PREFIX,
  releaseName,
  releaseZipUrl,
} from "../../scripts/releaseDownload";

describe("a release's zip", () => {
  test("is named c1x and its version", () => {
    expect(releaseName("1.5")).toBe("c1x-1.5");
  });

  test("downloads from its release on GitHub, tagged with a v", () => {
    expect(releaseZipUrl("1.5")).toBe(
      "https://github.com/KallumP/c1x/releases/download/v1.5/c1x-1.5.zip",
    );
  });
});

describe("the player's Downloads folder", () => {
  test("is the Downloads folder in their home folder", () => {
    expect(downloadsFolder("C:/Users/me")).toBe(join("C:/Users/me", "Downloads"));
  });
});

describe("downloading a release", () => {
  let downloads: string; // a stand-in for the player's Downloads folder

  beforeEach(() => {
    downloads = join(mkdtempSync(join(tmpdir(), "downloads-")), "Downloads");
  });
  afterEach(() => { rmSync(dirname(downloads), { recursive: true, force: true }); });

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
    const exitCode = await downloadReleaseCommand(version, (line) => said.push(line), {
      downloadFile,
      downloads,
    });
    return { exitCode, said, asked };
  }

  const ZIP = new Uint8Array([80, 75, 3, 4]);
  const savedPath = () => join(downloads, "c1x-1.5.zip");

  test("downloads the version's zip from GitHub", async () => {
    expect((await downloaded("1.5")).asked).toEqual([releaseZipUrl("1.5")]);
  });

  test("saves it in Downloads by its name, making the folder if it isn't there", async () => {
    await downloaded("1.5");
    expect(new Uint8Array(readFileSync(savedPath()))).toEqual(ZIP);
  });

  test("says where it saved it, and works", async () => {
    expect(await downloaded("1.5")).toMatchObject({
      exitCode: 0,
      said: [`${RELEASE_SAVED_PREFIX}${savedPath()}`],
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
});

describe("what the launcher reads", () => {
  test("starts as the launcher's code says it does", () => {
    const codeUrl = new URL("../../../../src/launcher/release_download.c", import.meta.url);
    const launcherCode = readFileSync(fileURLToPath(codeUrl), "utf8");
    const launchersPrefix = /#define RELEASE_SAVED "(.*)"/.exec(launcherCode)?.[1];
    expect(launchersPrefix).toBe(RELEASE_SAVED_PREFIX);
  });
});
