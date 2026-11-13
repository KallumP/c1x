// a level's own song as an audio file (see doc/custom_levels.md): level.cfg's
// music naming an .mp3, .ogg, .flac or .wav in its source's folder. the build
// puts it next to the level, named after it, where the game looks for it
// (src/pc/audiosong.c)
import { copyFileSync, rmSync } from "node:fs";
import { extname, join } from "node:path";
import { AUDIO_SONG_EXTENSIONS, isAudioSongName } from "../src/music";

// copies the audio file music names (if it names one) from the level source
// in folder next to the level called name in levelsDir, as <name>.<kind>, and
// removes any other the level's earlier builds left
export function copyAudioSong(folder: string, levelsDir: string, name: string, music: string): void {
  const kept = isAudioSongName(music) ? extname(music).toLowerCase() : null;
  for (const extension of AUDIO_SONG_EXTENSIONS.filter((extension) => extension !== kept)) {
    rmSync(join(levelsDir, `${name}${extension}`), { force: true });
  }
  if (kept) {
    copyFileSync(join(folder, music), join(levelsDir, `${name}${kept}`));
  }
}
