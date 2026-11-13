import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { copyAudioSong } from "../../builder/audioSong";

// a level source folder and a levels folder, both empty
function folders() {
  return { source: mkdtempSync(join(tmpdir(), "audio-song-source-")), levels: mkdtempSync(join(tmpdir(), "audio-song-levels-")) };
}

describe("a level's audio song", () => {
  test("the audio file level.cfg picks goes next to the built level, named after it", () => {
    const { source, levels } = folders();
    writeFileSync(join(source, "My Song.MP3"), "mp3 data");
    copyAudioSong(source, levels, "4_acid_cave", "My Song.MP3");
    expect(readFileSync(join(levels, "4_acid_cave.mp3"), "utf8")).toBe("mp3 data");
  });

  test("one an earlier build left is removed when the level picks another song", () => {
    const { source, levels } = folders();
    writeFileSync(join(levels, "4_acid_cave.mp3"), "old");
    writeFileSync(join(levels, "4_acid_cave.wav"), "old");
    copyAudioSong(source, levels, "4_acid_cave", "the_lost_city");
    expect(existsSync(join(levels, "4_acid_cave.mp3"))).toBe(false);
    expect(existsSync(join(levels, "4_acid_cave.wav"))).toBe(false);
  });

  test("a level switching from one kind of audio file to another keeps only the new one", () => {
    const { source, levels } = folders();
    writeFileSync(join(levels, "4_acid_cave.mp3"), "old");
    writeFileSync(join(source, "theme.ogg"), "ogg data");
    copyAudioSong(source, levels, "4_acid_cave", "theme.ogg");
    expect(existsSync(join(levels, "4_acid_cave.mp3"))).toBe(false);
    expect(readFileSync(join(levels, "4_acid_cave.ogg"), "utf8")).toBe("ogg data");
  });

  test("another level's audio song is left alone", () => {
    const { source, levels } = folders();
    writeFileSync(join(levels, "1_tide_ruins.mp3"), "theirs");
    copyAudioSong(source, levels, "4_acid_cave", "the_lost_city");
    expect(existsSync(join(levels, "1_tide_ruins.mp3"))).toBe(true);
  });
});
