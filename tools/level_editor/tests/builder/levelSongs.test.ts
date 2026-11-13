import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { copyLevelSongs } from "../../builder/levelSongs";

const newFolder = (prefix: string) => mkdtempSync(join(tmpdir(), prefix));

// a level source's folder holding files (name to contents)
function sourceWith(files: Record<string, string>): string {
  const folder = newFolder("song-source-");
  Object.entries(files).forEach(([name, contents]) => writeFileSync(join(folder, name), contents));
  return folder;
}

describe("a level's own song", () => {
  test("the song files the source has go next to the built level, named after it", () => {
    const levels = newFolder("song-levels-");
    copyLevelSongs(sourceWith({ "music.mid": "song", "music_aku.mid": "aku", "music.sf2": "sounds" }), levels, "my_level");
    expect(readFileSync(join(levels, "my_level.mid"), "utf8")).toBe("song");
    expect(readFileSync(join(levels, "my_level_aku.mid"), "utf8")).toBe("aku");
    expect(readFileSync(join(levels, "my_level.sf2"), "utf8")).toBe("sounds");
  });

  test("only those the source has: a .mid without its own instruments or aku aku's song", () => {
    const levels = newFolder("song-levels-");
    copyLevelSongs(sourceWith({ "music.mid": "song" }), levels, "my_level");
    expect(existsSync(join(levels, "my_level.mid"))).toBe(true);
    expect(existsSync(join(levels, "my_level_aku.mid"))).toBe(false);
    expect(existsSync(join(levels, "my_level.sf2"))).toBe(false);
  });

  test("ones an earlier build left that the source no longer has go", () => {
    const levels = newFolder("song-levels-");
    copyLevelSongs(sourceWith({ "music.mid": "song", "music.sf2": "sounds" }), levels, "my_level");
    copyLevelSongs(sourceWith({}), levels, "my_level");
    expect(existsSync(join(levels, "my_level.mid"))).toBe(false);
    expect(existsSync(join(levels, "my_level.sf2"))).toBe(false);
  });

  test("another level's songs are left alone", () => {
    const levels = newFolder("song-levels-");
    writeFileSync(join(levels, "other.mid"), "theirs");
    copyLevelSongs(sourceWith({}), levels, "my_level");
    expect(existsSync(join(levels, "other.mid"))).toBe(true);
  });
});
