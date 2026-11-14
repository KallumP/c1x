import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { copyAudioSong, writeAudioSongVolume } from "../../builder/audioSong";

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

describe("a level's audio song's volume", () => {
  test("a song turned up or down has its volume, a percent, next to the built level", () => {
    const { levels } = folders();
    writeAudioSongVolume(levels, "3_sunset_canyon", "song.mp3", 150);
    expect(readFileSync(join(levels, "3_sunset_canyon.volume"), "utf8")).toBe("150");
  });

  test("a song at the game's music loudness has none, and one an earlier build left is removed", () => {
    const { levels } = folders();
    writeFileSync(join(levels, "3_sunset_canyon.volume"), "150");
    writeAudioSongVolume(levels, "3_sunset_canyon", "song.mp3", 100);
    expect(existsSync(join(levels, "3_sunset_canyon.volume"))).toBe(false);
  });

  test("a level playing one of the game's songs has none", () => {
    const { levels } = folders();
    writeFileSync(join(levels, "3_sunset_canyon.volume"), "150");
    writeAudioSongVolume(levels, "3_sunset_canyon", "the_lost_city", 150);
    expect(existsSync(join(levels, "3_sunset_canyon.volume"))).toBe(false);
  });
});
