// a level's own song (see doc/custom_levels.md): music.mid in its source's
// folder, with aku aku's song (music_aku.mid) and its instruments (music.sf2)
// if it has them. the build puts them next to the level, named after it, where
// the game looks for them (src/pc/levelsong.c)
import { copyFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

// each song file a level source can have, and how it's named next to the built level
const SONG_FILES = [
  { source: "music.mid", built: (name: string) => `${name}.mid` },
  { source: "music_aku.mid", built: (name: string) => `${name}_aku.mid` },
  { source: "music.sf2", built: (name: string) => `${name}.sf2` },
];

// copies the song files the level source in folder has next to the level called
// name in levelsDir, and removes those an earlier build left that it no longer has
export function copyLevelSongs(folder: string, levelsDir: string, name: string): void {
  for (const { source, built } of SONG_FILES) {
    const from = join(folder, source);
    const to = join(levelsDir, built(name));
    if (existsSync(from)) {
      copyFileSync(from, to);
    } else {
      rmSync(to, { force: true });
    }
  }
}
