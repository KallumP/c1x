/*
 * a custom level's own song (pc), see levelsong.h
 */
#include <stdio.h>
#include <stdlib.h>
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

/* the level's song, if it plays its own: only in a custom level, and only with a .mid */
const level_song *LevelSongToPlay(int in_custom_level) {
  if (!in_custom_level || !LevelSongIsOwn(&custom_level_song)) { return 0; }
  return &custom_level_song;
}

/* how many tracks the music has: its own song's (aku aku's song is a second), else the music's track_count */
int LevelSongTrackCount(const level_song *song, int track_count) {
  if (!song || !LevelSongIsOwn(song)) { return track_count; }
  if (song->has_aku_mid) { return 2; }
  return 1;
}

/* the file at path, read whole into memory (to free), its size into size; 0 if it can't be read */
uint8_t *LevelSongReadFile(const char *path, size_t *size) {
  FILE *file;
  uint8_t *data;
  long length;

  file = fopen(path, "rb");
  if (!file) { return 0; }
  fseek(file, 0, SEEK_END);
  length = ftell(file);
  fseek(file, 0, SEEK_SET);
  data = 0;
  if (length > 0) { data = (uint8_t*)malloc(length); }
  if (data && fread(data, 1, length, file) != (size_t)length) {
    free(data);
    data = 0;
  }
  fclose(file);
  *size = 0;
  if (data) { *size = (size_t)length; }
  return data;
}
