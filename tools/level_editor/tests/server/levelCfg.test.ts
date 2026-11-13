import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseLevelCfg, readLevelCfg, setLevelCfg, writeLevelCfg, type LevelCfg } from "../../server/levelCfg";
import { DEFAULT_CAMERA } from "../../src/camera";
import { DEFAULT_MUSIC } from "../../src/music";
import { DEFAULT_SKY } from "../../src/sky";

// the default level.cfg, with changes
const cfg = (changes: Partial<LevelCfg> = {}): LevelCfg => ({ turn: 0, scale: 400, sky: DEFAULT_SKY, camera: DEFAULT_CAMERA, music: DEFAULT_MUSIC, ...changes });

describe("parseLevelCfg", () => {
  test("reads turn and scale, skipping comments", () => {
    expect(parseLevelCfg("# facing the castle\nturn = 270\nscale = 2000\n")).toEqual(cfg({ turn: 270, scale: 2000 }));
  });

  test("is the defaults for what isn't set", () => {
    expect(parseLevelCfg("")).toEqual(cfg());
    expect(parseLevelCfg("scale = 800\r\n")).toEqual(cfg({ scale: 800 }));
  });

  test("reads the sky, n. sanity beach's for what isn't set", () => {
    expect(parseLevelCfg("sky_top = 1, 2, 3\nsky_split = 50\n").sky).toEqual({ ...DEFAULT_SKY, top: [1, 2, 3], split: 50 });
    expect(parseLevelCfg("sky_bottom=0,0,0\r\n").sky).toEqual({ ...DEFAULT_SKY, bottom: [0, 0, 0] });
  });

  test("skips a sky it can't read", () => {
    expect(parseLevelCfg("sky_top = 1, 2\nsky_split = 999\n").sky).toEqual(DEFAULT_SKY);
  });

  test("reads the camera's distance and angle, the usual ones for what isn't set or can't be read", () => {
    expect(parseLevelCfg("camera_distance = 1.5\ncamera_angle = 60\n").camera).toEqual({ distance: 1.5, angle: 60 });
    expect(parseLevelCfg("camera_angle = 30\n").camera).toEqual({ ...DEFAULT_CAMERA, angle: 30 });
    expect(parseLevelCfg("camera_distance = 9\ncamera_angle = 5\n").camera).toEqual(DEFAULT_CAMERA);
  });

  test("reads the music, jungle rollers' for what isn't set or isn't a soundtrack", () => {
    expect(parseLevelCfg("music = the_lost_city\n").music).toBe("the_lost_city");
    expect(parseLevelCfg("").music).toBe(DEFAULT_MUSIC);
    expect(parseLevelCfg("music = sunset_vista\n").music).toBe(DEFAULT_MUSIC);
  });

  test("reads a negative turn", () => {
    expect(parseLevelCfg("turn = -90\n").turn).toBe(-90);
  });
});

describe("setLevelCfg", () => {
  test("changes the turn and scale lines, keeping comments and the rest", () => {
    expect(setLevelCfg("# a note\nturn = 0\n\nscale = 400\n", cfg({ turn: 90, scale: 800 })))
      .toBe("# a note\nturn = 90\n\nscale = 800\n");
  });

  test("leaves commented ones alone, adding lines at the end", () => {
    expect(setLevelCfg("# turn = 90\n", cfg({ turn: 180 }))).toBe("# turn = 90\nturn = 180\nscale = 400\n");
  });

  test("adds after a last line with no newline", () => {
    expect(setLevelCfg("turn = 0", cfg({ scale: 500 }))).toBe("turn = 0\nscale = 500\n");
  });

  test("leaves out a default sky and camera", () => {
    expect(setLevelCfg("", cfg({ turn: 270 }))).toBe("turn = 270\nscale = 400\n");
  });

  test("keeps crlf line endings", () => {
    expect(setLevelCfg("# a\r\nturn = 0\r\n", cfg({ turn: 90 }))).toBe("# a\r\nturn = 90\r\nscale = 400\r\n");
  });

  test("changes the sky's lines, and adds them for a sky that isn't the default", () => {
    const sky = { ...DEFAULT_SKY, top: [1, 2, 3] as [number, number, number], split: 100 };
    expect(setLevelCfg("turn = 0\nscale = 400\nsky_split = 20\n", cfg({ sky })))
      .toBe("turn = 0\nscale = 400\nsky_split = 100\nsky_top = 1, 2, 3\n");
  });

  test("refuses a sky the build can't take", () => {
    const badTop = { ...DEFAULT_SKY, top: [256, 0, 0] as [number, number, number] };
    expect(() => setLevelCfg("", cfg({ sky: badTop }))).toThrow("sky_top has to be red, green, blue");
    expect(() => setLevelCfg("", cfg({ sky: { ...DEFAULT_SKY, split: 217 } }))).toThrow("sky_split has to be 0 to 216");
  });

  test("writes a camera that isn't the usual one", () => {
    expect(setLevelCfg("", cfg({ camera: { distance: 1.5, angle: 60 } })))
      .toBe("turn = 0\nscale = 400\ncamera_distance = 1.5\ncamera_angle = 60\n");
  });

  test("changes a camera line already there, even to the usual camera", () => {
    expect(setLevelCfg("camera_angle = 60\n", cfg())).toBe("camera_angle = 42\nturn = 0\nscale = 400\n");
  });

  test("refuses a camera the build can't take", () => {
    expect(() => setLevelCfg("", cfg({ camera: { distance: 4, angle: 42 } }))).toThrow("camera_distance has to be 0.5 to 3");
    expect(() => setLevelCfg("", cfg({ camera: { distance: 1, angle: 90 } }))).toThrow("camera_angle has to be 10 to 80");
  });

  test("writes music that isn't jungle rollers', and changes a music line already there", () => {
    expect(setLevelCfg("", cfg({ music: "the_lost_city" }))).toBe("turn = 0\nscale = 400\nmusic = the_lost_city\n");
    expect(setLevelCfg("music = boulders\n", cfg())).toBe("music = jungle_rollers\nturn = 0\nscale = 400\n");
  });

  test("refuses music that isn't one of the soundtracks", () => {
    expect(() => setLevelCfg("", cfg({ music: "sunset_vista" }))).toThrow("music has to be one of");
  });

  test("refuses a turn the build can't do", () => {
    expect(() => setLevelCfg("", cfg({ turn: 45 }))).toThrow("turn has to be 0, 90, 180 or 270");
  });

  test("refuses a scale that isn't a positive whole number", () => {
    expect(() => setLevelCfg("", cfg({ scale: 0 }))).toThrow("scale has to be a whole number above 0");
    expect(() => setLevelCfg("", cfg({ scale: 12.5 }))).toThrow("scale has to be a whole number above 0");
  });
});

describe("a level's level.cfg", () => {
  let root: string;
  const level = (name: string, cfg?: string) => {
    mkdirSync(join(root, name));
    writeFileSync(join(root, name, `${name}.obj`), "");
    if (cfg !== undefined) {
      writeFileSync(join(root, name, "level.cfg"), cfg);
    }
  };
  beforeEach(() => { root = mkdtempSync(join(tmpdir(), "level_src-")); });
  afterEach(() => { rmSync(root, { recursive: true, force: true }); });

  test("reads the level's level.cfg", () => {
    level("big", "turn = 90\n");
    expect(readLevelCfg(root, "big")).toEqual(cfg({ turn: 90 }));
  });

  test("writes the level's level.cfg over what it had", () => {
    level("big", "# big\nturn = 90\n");
    writeLevelCfg(root, "big", cfg({ turn: 180 }));
    expect(readFileSync(join(root, "big", "level.cfg"), "utf8")).toBe("# big\nturn = 180\nscale = 400\n");
  });

  test("a level without one reads as the defaults, and gets one when written", () => {
    level("plain");
    expect(readLevelCfg(root, "plain")).toEqual(cfg());
    writeLevelCfg(root, "plain", cfg({ scale: 600 }));
    expect(readFileSync(join(root, "plain", "level.cfg"), "utf8")).toBe("turn = 0\nscale = 600\n");
  });

  test("won't read or write a level that isn't listed", () => {
    expect(() => readLevelCfg(root, "nope")).toThrow("no level source nope");
    expect(() => writeLevelCfg(root, "../x", cfg())).toThrow("no level source ../x");
  });
});
