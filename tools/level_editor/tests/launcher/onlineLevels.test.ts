import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import {
  listOnlineLevelsCommand,
  ONLINE_LEVEL_PREFIX,
  onlineLevelLine,
} from "../../launcher/onlineLevels";
import type { OnlineLevel } from "../../scripts/modio";

const TIDE_RUINS: OnlineLevel = {
  id: 17302,
  name: "Tide Ruins",
  author: "kallum",
  fileUrl: "",
};

// runs the command for name with stand-in levels (or why there are none); its exit
// code, what it said, and the names the list was asked for
async function listed(levels: OnlineLevel[] | { problem: string }, name = "") {
  const said: string[] = [];
  const askedFor: string[] = [];
  const list = async (asked: string) => {
    askedFor.push(asked);
    return levels;
  };
  const exitCode = await listOnlineLevelsCommand(name, (line) => said.push(line), list);
  return { exitCode, said, askedFor };
}

describe("an online level's line", () => {
  test("is its id, author and name after the prefix, between tabs", () => {
    expect(onlineLevelLine(TIDE_RUINS)).toBe(
      `${ONLINE_LEVEL_PREFIX}17302\tkallum\tTide Ruins`,
    );
  });

  test("has no tabs or line ends in its name or author but those", () => {
    const level = { ...TIDE_RUINS, name: "Tide\tRuins\r\n2", author: "kal\nlum" };
    expect(onlineLevelLine(level)).toBe(
      `${ONLINE_LEVEL_PREFIX}17302\tkal lum\tTide Ruins  2`,
    );
  });
});

describe("listing the online levels", () => {
  test("says each level's line, and works", async () => {
    const other = { ...TIDE_RUINS, id: 2, name: "Mossy Creek" };
    expect(await listed([TIDE_RUINS, other])).toMatchObject({
      exitCode: 0,
      said: [onlineLevelLine(TIDE_RUINS), onlineLevelLine(other)],
    });
  });

  test("says when there are none", async () => {
    expect(await listed([])).toMatchObject({
      exitCode: 0,
      said: ["no levels are on mod.io yet"],
    });
  });

  test("asks for the levels with the name in theirs", async () => {
    expect((await listed([TIDE_RUINS], "tide")).askedFor).toEqual(["tide"]);
  });

  test("says when none have the name in theirs", async () => {
    expect(await listed([], "zzz")).toMatchObject({
      exitCode: 0,
      said: ['no levels on mod.io have "zzz" in their name'],
    });
  });

  test("says why it couldn't list them, and fails", async () => {
    const offline = { problem: "mod.io couldn't be reached (offline)" };
    expect(await listed(offline)).toMatchObject({
      exitCode: 1,
      said: ["couldn't list the levels on mod.io: mod.io couldn't be reached (offline)"],
    });
  });
});

describe("what the launcher reads", () => {
  test("starts as the launcher's code says it does", () => {
    const launcherCode = readFileSync(
      fileURLToPath(new URL("../../../../src/launcher/online_levels.c", import.meta.url)),
      "utf8",
    );
    expect(/#define ONLINE_LEVEL "(.*)"/.exec(launcherCode)?.[1]).toBe(
      ONLINE_LEVEL_PREFIX,
    );
  });
});
