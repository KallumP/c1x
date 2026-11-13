#include <stdio.h>
#include <unistd.h>
#include "pc/audiosong.h"

static const char *audio_song_kinds[] = { ".mp3", ".ogg", ".flac", ".wav" };
#define AUDIO_SONG_KIND_COUNT (sizeof(audio_song_kinds) / sizeof(audio_song_kinds[0]))

audio_song custom_level_audio_song;

/* the level's song: the first of <level>.mp3, .ogg, .flac and .wav that's there */
void AudioSongFind(const char *level, audio_song *song) {
  int i;

  song->has_song = 0;
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
