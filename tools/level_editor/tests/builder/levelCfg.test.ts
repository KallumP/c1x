import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { levelOptions, readLevelCfg } from "../../builder/levelCfg";
import { DEFAULT_CAMERA } from "../../src/camera";
import { DEFAULT_MUSIC } from "../../src/music";
import { DEFAULT_SKY } from "../../src/sky";

// a temporary level source folder, holding level.cfg with text (if given)
function sourceFolder(text?: string): string {
  const folder = mkdtempSync(join(tmpdir(), "level-cfg-"));
  if (text !== undefined) {
    writeFileSync(join(folder, "level.cfg"), text);
  }
  return folder;
}

describe("a level's scale, turn and sky", () => {
  test("without a level.cfg, a level has the default options", () => {
    // the default scale, no turn and n. sanity beach's sky
    expect(levelOptions(sourceFolder())).toEqual({ scale: 400, turn: 0, sky: DEFAULT_SKY, camera: DEFAULT_CAMERA, music: DEFAULT_MUSIC });
  });

  test("level.cfg sets them, skipping comments and blank lines", () => {
    expect(levelOptions(sourceFolder("# the castle\n\nturn = 270\nscale=2000\n"))).toEqual({ scale: 2000, turn: 270, sky: DEFAULT_SKY, camera: DEFAULT_CAMERA, music: DEFAULT_MUSIC });
  });

  test("level.cfg sets the sky", () => {
    // its top and bottom colours, and how far down the screen they split
    const folder = sourceFolder("sky_top = 10, 20, 30\nsky_bottom=0,0,255\nsky_split = 100\n");
    expect(levelOptions(folder).sky).toEqual({ top: [10, 20, 30], bottom: [0, 0, 255], split: 100 });
    expect(levelOptions(sourceFolder("sky_split = 0\n")).sky).toEqual({ ...DEFAULT_SKY, split: 0 });
  });

  test("level.cfg can set just one", () => {
    expect(levelOptions(sourceFolder("turn = 90\n"))).toEqual({ scale: 400, turn: 90, sky: DEFAULT_SKY, camera: DEFAULT_CAMERA, music: DEFAULT_MUSIC });
  });

  test("level.cfg sets the camera's distance and angle", () => {
    // how far the camera is from crash (times its usual distance), and how far above him it looks down from (degrees)
    expect(levelOptions(sourceFolder("camera_distance = 1.5\ncamera_angle = 30\n")).camera).toEqual({ distance: 1.5, angle: 30 });
    expect(levelOptions(sourceFolder("camera_angle = 60\n")).camera).toEqual({ distance: 1, angle: 60 });
  });

  test("level.cfg sets the music, one of the game's soundtracks", () => {
    expect(levelOptions(sourceFolder("music = the_lost_city\n")).music).toBe("the_lost_city");
  });

  test("ones given override level.cfg", () => {
    const folder = sourceFolder("turn = 270\nscale = 2000\n");
    expect(levelOptions(folder, { scale: 1000 })).toEqual({ scale: 1000, turn: 270, sky: DEFAULT_SKY, camera: DEFAULT_CAMERA, music: DEFAULT_MUSIC });
    expect(levelOptions(folder, { turn: 0 })).toEqual({ scale: 2000, turn: 0, sky: DEFAULT_SKY, camera: DEFAULT_CAMERA, music: DEFAULT_MUSIC });
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

  test("a sky colour that isn't three numbers from 0 to 255", () => {
    expect(readError("sky_top = 10, 20\n")).toThrow(/level\.cfg, line 1: sky_top has to be red, green, blue \(0 to 255 each\), not 10, 20/);
    expect(readError("sky_bottom = 300, 0, 0\n")).toThrow(/sky_bottom has to be red, green, blue/);
  });

  test("a sky split off the screen", () => {
    expect(readError("sky_split = 217\n")).toThrow(/level\.cfg, line 1: sky_split has to be 0 to 216, not 217/);
  });

  test("a camera distance or angle out of its range", () => {
    expect(readError("camera_distance = 4\n")).toThrow(/level\.cfg, line 1: camera_distance has to be 0\.5 to 3, not 4/);
    expect(readError("camera_distance = far\n")).toThrow(/camera_distance has to be 0\.5 to 3, not far/);
    expect(readError("camera_angle = 90\n")).toThrow(/level\.cfg, line 1: camera_angle has to be 10 to 80, not 90/);
    expect(readError("camera_angle = 30.5\n")).toThrow(/camera_angle has to be a whole number, not 30\.5/);
  });

  test("music that isn't one of the soundtracks, listing them", () => {
    expect(readError("music = sunset_vista\n")).toThrow(/level\.cfg, line 1: music has to be one of n_sanity_beach, jungle_rollers, .*, not sunset_vista/);
  });

  test("a line without a value", () => {
    expect(readError("scale\n")).toThrow(/level\.cfg, line 1: expected key = value/);
  });
});
