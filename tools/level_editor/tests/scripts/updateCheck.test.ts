import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { checkUpdate, isNewer, latestRelease, NEWER_RELEASE_PREFIX, versionNumbers } from "../../scripts/updateCheck";
import type { LatestRelease } from "../../scripts/updateCheck";

describe("a version's numbers", () => {
  test("are its two numbers", () => {
    expect(versionNumbers("1.4")).toEqual([1, 4]);
  });

  test("are a tag's, after its v", () => {
    expect(versionNumbers("v10.12")).toEqual([10, 12]);
  });

  test("aren't there for anything else", () => {
    ["", "1", "1.4.2", "v1.4-beta", "latest", "1.4\n", " 1.4"].forEach((version) =>
      expect(versionNumbers(version)).toBeUndefined());
  });
});

describe("a release is newer than a version", () => {
  test("with a higher second number, compared as a number", () => {
    expect(isNewer("1.9", "v1.10")).toBe(true);
  });

  test("with a higher first number, compared as a number", () => {
    expect(isNewer("9.9", "v10.0")).toBe(true);
  });

  test("not when it's the same version", () => {
    expect(isNewer("1.4", "v1.4")).toBe(false);
  });

  test("not when it's older", () => {
    expect(isNewer("1.4", "v1.3")).toBe(false);
    expect(isNewer("2.0", "v1.9")).toBe(false);
    expect(isNewer("10.0", "v9.9")).toBe(false);
  });

  test("not when its tag or the version isn't a version", () => {
    expect(isNewer("1.4", "nightly")).toBe(false);
    expect(isNewer("", "v1.5")).toBe(false);
  });
});

describe("what the launcher reads", () => {
  test("starts as the launcher's code says it does", () => {
    const launcherCode = readFileSync(
      fileURLToPath(new URL("../../../../src/launcher/newer_release.c", import.meta.url)),
      "utf8",
    );
    expect(/#define NEWER_RELEASE "(.*)"/.exec(launcherCode)?.[1]).toBe(NEWER_RELEASE_PREFIX);
  });
});

describe("checking for an update", () => {
  // what's said and the exit code, for a version and what GitHub answers
  const check = async (version: string, latest: LatestRelease) => {
    const said: string[] = [];
    const exitCode = await checkUpdate(version, (line) => said.push(line), async () => latest);
    return { said, exitCode };
  };

  test("says a newer release's version, for the launcher to read", async () => {
    expect(await check("1.4", { tag: "v1.5" })).toEqual({ said: ["newer release: 1.5"], exitCode: 0 });
  });

  test("says a newer release's version without the v its tag may not have", async () => {
    expect(await check("1.4", { tag: "1.5" })).toEqual({ said: ["newer release: 1.5"], exitCode: 0 });
  });

  test("says there's nothing newer when up to date", async () => {
    expect(await check("1.5", { tag: "v1.5" })).toEqual({ said: ["no release is newer than 1.5"], exitCode: 0 });
  });

  test("fails for a version that isn't one, without asking GitHub", async () => {
    const said: string[] = [];
    const neverAsked = async (): Promise<LatestRelease> => {
      throw new Error("asked GitHub");
    };
    expect(await checkUpdate("banana", (line) => said.push(line), neverAsked)).toBe(1);
    expect(said).toEqual(['"banana" isn\'t a version: it has to be two numbers, like 1.3']);
  });

  test("fails, saying why, when GitHub can't be asked", async () => {
    expect(await check("1.4", { problem: "GitHub answered 403" })).toEqual({
      said: ["couldn't tell the latest release: GitHub answered 403"],
      exitCode: 1,
    });
  });

  test("fails when the latest release's tag isn't a version", async () => {
    expect(await check("1.4", { tag: "nightly" })).toEqual({
      said: ['couldn\'t tell the latest release: its tag "nightly" isn\'t a version'],
      exitCode: 1,
    });
  });
});

describe("GitHub's latest release", () => {
  const answering = (status: number, body: unknown) => async () => new Response(JSON.stringify(body), { status });

  test("is asked of c1x's repository", async () => {
    const asked: string[] = [];
    await latestRelease(async (url) => {
      asked.push(String(url));
      return new Response("{}");
    });
    expect(asked).toEqual(["https://api.github.com/repos/KallumP/c1x/releases/latest"]);
  });

  test("is the tag in its answer", async () => {
    expect(await latestRelease(answering(200, { tag_name: "v1.5", name: "Crash 1 Enhanced v1.5" }))).toEqual({ tag: "v1.5" });
  });

  test("can't be told when GitHub refuses, as it does past its hourly limit", async () => {
    expect(await latestRelease(answering(403, { message: "API rate limit exceeded" }))).toEqual({
      problem: "GitHub answered 403",
    });
  });

  test("can't be told when there's no release", async () => {
    expect(await latestRelease(answering(404, { message: "Not Found" }))).toEqual({ problem: "GitHub answered 404" });
  });

  test("can't be told from an answer without a tag", async () => {
    expect(await latestRelease(answering(200, { name: "v1.5" }))).toEqual({ problem: "GitHub's answer has no tag" });
    expect(await latestRelease(answering(200, { tag_name: 15 }))).toEqual({ problem: "GitHub's answer has no tag" });
    expect(await latestRelease(answering(200, null))).toEqual({ problem: "GitHub's answer has no tag" });
  });

  test("can't be told when GitHub can't be reached", async () => {
    const offline = async (): Promise<Response> => {
      throw new Error("getaddrinfo ENOTFOUND api.github.com");
    };
    expect(await latestRelease(offline)).toEqual({
      problem: "GitHub couldn't be reached (getaddrinfo ENOTFOUND api.github.com)",
    });
  });
});
