/*
 * a custom level's own song (pc), see levelsong.h
 */
#include <stdio.h>
#include <unistd.h>
#include "levelsong.h"

level_song custom_level_song = { 0 };

/* the path of level's file ending in suffix into path; whether it's there */
static int FindSongFile(const char *level, const char *suffix, char *path) {
  snprintf(path, LEVEL_SONG_PATH_MAX, "%s%s", level, suffix);
  return access(path, 0) == 0;
}

/* the song files of level (its path without an extension) */
void LevelSongFind(const char *level, level_song *song) {
  song->has_mid = FindSongFile(level, ".mid", song->mid);
  song->has_aku_mid = FindSongFile(level, "_aku.mid", song->aku_mid);
  song->has_sf2 = FindSongFile(level, ".sf2", song->sf2);
}

/* whether the level plays its own song: it has a .mid (a .sf2 alone is only instruments) */
int LevelSongIsOwn(const level_song *song) {
  return song->has_mid;
}
