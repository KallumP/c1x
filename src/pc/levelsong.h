#ifndef _PC_LEVELSONG_H_
#define _PC_LEVELSONG_H_

#include <stddef.h>
#include <stdint.h>

/*
 * a custom level's own song (pc): <level>.mid next to its .nsd and .nsf,
 * with aku aku's song (<level>_aku.mid) and its instruments (<level>.sf2) if
 * it has them. the level builder puts them there from its source's music.mid,
 * music_aku.mid and music.sf2. fluidsynth plays them in place of the level's music
 */
#define LEVEL_SONG_PATH_MAX 1024

typedef struct {
  char mid[LEVEL_SONG_PATH_MAX];
  char aku_mid[LEVEL_SONG_PATH_MAX];
  char sf2[LEVEL_SONG_PATH_MAX];
  int has_mid;
  int has_aku_mid;
  int has_sf2;
} level_song;

extern level_song custom_level_song; /* the boot level's (InitBootLevel) */

extern void LevelSongFind(const char *level, level_song *song);
extern int LevelSongIsOwn(const level_song *song);

#endif /* _PC_LEVELSONG_H_ */
