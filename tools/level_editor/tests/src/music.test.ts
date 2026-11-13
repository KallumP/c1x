import { describe, expect, test } from "vitest";
import { AUDIO_SONG_EXTENSIONS, DEFAULT_MUSIC, isAudioSongName, isMusicName, SOUNDTRACKS, soundtrack } from "../../src/music";

describe("soundtracks", () => {
  test("a level plays jungle rollers' music unless it picks another, as before", () => {
    expect(DEFAULT_MUSIC).toBe("jungle_rollers");
    expect(soundtrack(DEFAULT_MUSIC).lid).toBe(0xc);
  });

  test("each soundtrack has its own name, as level.cfg spells it", () => {
    const names = SOUNDTRACKS.map(({ name }) => name);
    expect(new Set(names).size).toBe(names.length);
    names.forEach((name) => expect(name).toMatch(/^[a-z0-9_]+$/));
  });

  test("each soundtrack is a level of the game's own, by its file in streams/", () => {
    SOUNDTRACKS.forEach(({ lid }) => expect(lid).toBeGreaterThan(0x1));
    expect(new Set(SOUNDTRACKS.map(({ lid }) => lid)).size).toBe(SOUNDTRACKS.length);
  });

  test("names are known or not", () => {
    expect(isMusicName("sunset_vista")).toBe(false); // the lost city's music, named by the first level with it
    expect(isMusicName("the_lost_city")).toBe(true);
    expect(isMusicName("")).toBe(false);
  });

  test("soundtracks without aku aku's song (a second track) say so", () => {
    expect(soundtrack("jungle_rollers").akuAkuSong).toBe(true);
    expect(soundtrack("hog_wild").akuAkuSong).toBe(false);
  });

  test("an audio file is a song by its extension, any case", () => {
    expect(AUDIO_SONG_EXTENSIONS).toEqual([".mp3", ".ogg", ".flac", ".wav"]);
    ["a.mp3", "My Song.MP3", "theme.ogg", "loop.flac", "take 2.wav"].forEach((name) => expect(isAudioSongName(name)).toBe(true));
    ["notes.txt", "music.mid", "mp3", "song.mp3.bak", ""].forEach((name) => expect(isAudioSongName(name)).toBe(false));
  });

  test("an audio file's name is never a soundtrack's", () => {
    SOUNDTRACKS.forEach(({ name }) => expect(isAudioSongName(name)).toBe(false));
  });
});
