// a level's own song as an audio file (see doc/custom_levels.md): level.cfg's
// music naming an .mp3, .ogg, .flac or .wav in its source's folder. the build
// puts it next to the level, named after it, where the game looks for it
// (src/pc/audiosong.c)
import { copyFileSync, rmSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { AUDIO_SONG_EXTENSIONS, DEFAULT_MUSIC_VOLUME, isAudioSongName } from "../src/music";

// the kind of audio file (its extension) music names, if it names one
function keptKind(music: string): string | null {
  if (!isAudioSongName(music)) {
    return null;
  }
  return extname(music).toLowerCase();
}

// copies the audio file music names (if it names one) from the level source
// in folder next to the level called name in levelsDir, as <name>.<kind>, and
// removes any other the level's earlier builds left
export function copyAudioSong(folder: string, levelsDir: string, name: string, music: string): void {
  const kept = keptKind(music);
  for (const extension of AUDIO_SONG_EXTENSIONS.filter((extension) => extension !== kept)) {
    rmSync(join(levelsDir, `${name}${extension}`), { force: true });
  }
  if (kept) {
    copyFileSync(join(folder, music), join(levelsDir, `${name}${kept}`));
  }
}

// writes how loud the audio file music names plays (volume, a percent of the game's music
// loudness) next to the level called name in levelsDir, as <name>.volume, where the game reads
// it with the song; a level without one plays it at 100, so none is written for that (and any
// an earlier build left is removed)
export function writeAudioSongVolume(levelsDir: string, name: string, music: string, volume: number): void {
  const path = join(levelsDir, `${name}.volume`);
  if (!isAudioSongName(music) || volume === DEFAULT_MUSIC_VOLUME) {
    rmSync(path, { force: true });
    return;
  }
  writeFileSync(path, String(volume));
}
