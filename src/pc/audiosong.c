#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include "pc/audiosong.h"

static const char *audio_song_kinds[] = { ".mp3", ".ogg", ".flac", ".wav" };
#define AUDIO_SONG_KIND_COUNT (sizeof(audio_song_kinds) / sizeof(audio_song_kinds[0]))

audio_song custom_level_audio_song;

/* the volume <level>.volume gives, if it's a whole percent in range; the default without one */
static int ReadVolume(const char *level) {
  char path[AUDIO_SONG_PATH_MAX], text[16];
  FILE *file;
  char *end;
  long volume;

  snprintf(path, sizeof(path), "%s.volume", level);
  file = fopen(path, "rb");
  if (!file) { return AUDIO_SONG_VOLUME_DEFAULT; }
  text[0] = 0;
  if (!fgets(text, sizeof(text), file)) { text[0] = 0; }
  fclose(file);
  volume = strtol(text, &end, 10);
  if (end == text || volume < AUDIO_SONG_VOLUME_MIN || volume > AUDIO_SONG_VOLUME_MAX) {
    return AUDIO_SONG_VOLUME_DEFAULT;
  }
  return (int)volume;
}

/* the level's song: the first of <level>.mp3, .ogg, .flac and .wav that's there, at its volume */
void AudioSongFind(const char *level, audio_song *song) {
  int i;

  song->has_song = 0;
  song->volume = ReadVolume(level);
  song->path[0] = 0;
  for (i = 0; i < (int)AUDIO_SONG_KIND_COUNT; i++) {
    snprintf(song->path, sizeof(song->path), "%s%s", level, audio_song_kinds[i]);
    if (access(song->path, 0) == 0) {
      song->has_song = 1;
      return;
    }
  }
  song->path[0] = 0;
}

/* the audio song to play in place of the level's music: the custom level's, if it has one */
const audio_song *AudioSongToPlay(int in_custom_level) {
  if (!in_custom_level || !custom_level_audio_song.has_song) { return 0; }
  return &custom_level_audio_song;
}
