import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { levelOptions, readLevelCfg } from "../../builder/levelCfg";

// a temporary level source folder, holding level.cfg with text (if given)
function sourceFolder(text?: string): string {
  const folder = mkdtempSync(join(tmpdir(), "level-cfg-"));
  if (text !== undefined) {
    writeFileSync(join(folder, "level.cfg"), text);
  }
  return folder;
}

describe("a level's scale and turn", () => {
  test("without a level.cfg, the default scale and no turn", () => {
    expect(levelOptions(sourceFolder())).toEqual({ scale: 400, turn: 0 });
  });

  test("level.cfg sets them, skipping comments and blank lines", () => {
    expect(levelOptions(sourceFolder("# the castle\n\nturn = 270\nscale=2000\n"))).toEqual({ scale: 2000, turn: 270 });
  });

  test("level.cfg can set just one", () => {
    expect(levelOptions(sourceFolder("turn = 90\n"))).toEqual({ scale: 400, turn: 90 });
  });

  test("ones given override level.cfg", () => {
    const folder = sourceFolder("turn = 270\nscale = 2000\n");
    expect(levelOptions(folder, { scale: 1000 })).toEqual({ scale: 1000, turn: 270 });
    expect(levelOptions(folder, { turn: 0 })).toEqual({ scale: 2000, turn: 0 });
  });
});

describe("a bad level.cfg is an error naming it and its line", () => {
  const readError = (text: string) => () => readLevelCfg(sourceFolder(text));

  test("a value that isn't a whole number", () => {
    expect(readError("turn = 90\nscale = big\n")).toThrow(/level\.cfg, line 2: scale has to be a whole number, not big/);
  });

  test("an unknown setting", () => {
    expect(readError("tilt = 90\n")).toThrow(/level\.cfg, line 1: unknown setting tilt/);
  });

  test("a line without a value", () => {
    expect(readError("scale\n")).toThrow(/level\.cfg, line 1: expected key = value/);
  });
});
