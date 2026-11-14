#include <stdio.h>
#include <sys/stat.h>
#include "utest.h"
#include "pc/audiosong.h"

#define SONG_DIR "build/test_audiosong"

/* an empty file at path */
static void touch(const char *path) {
  FILE *file;

  file = fopen(path, "wb");
  if (file) { fclose(file); }
}

/* a fresh level, with none of the song files from another test */
static void fresh_level() {
  mkdir("build");
  mkdir(SONG_DIR);
  remove(SONG_DIR "/level.mp3");
  remove(SONG_DIR "/level.ogg");
  remove(SONG_DIR "/level.flac");
  remove(SONG_DIR "/level.wav");
  remove(SONG_DIR "/level.volume");
}

/* a file at path holding text */
static void write_text(const char *path, const char *text) {
  FILE *file;

  file = fopen(path, "wb");
  if (!file) { return; }
  fputs(text, file);
  fclose(file);
}

UTEST(audio_song, a_level_with_an_mp3_next_to_it_has_that_as_its_song) {
  audio_song song;

  fresh_level();
  touch(SONG_DIR "/level.mp3");
  AudioSongFind(SONG_DIR "/level", &song);
  ASSERT_TRUE(song.has_song);
  ASSERT_STREQ(SONG_DIR "/level.mp3", song.path);
}

UTEST(audio_song, an_ogg_flac_or_wav_is_a_song_too) {
  const char *kinds[] = { ".ogg", ".flac", ".wav" };
  char path[256];
  audio_song song;
  int i;

  for (i = 0; i < 3; i++) {
    fresh_level();
    snprintf(path, sizeof(path), "%s/level%s", SONG_DIR, kinds[i]);
    touch(path);
    AudioSongFind(SONG_DIR "/level", &song);
    ASSERT_TRUE(song.has_song);
    ASSERT_STREQ(path, song.path);
  }
}

UTEST(audio_song, a_level_without_one_has_none) {
  audio_song song;

  fresh_level();
  AudioSongFind(SONG_DIR "/level", &song);
  ASSERT_FALSE(song.has_song);
}

UTEST(audio_song, only_the_custom_level_plays_its_song_not_the_games_own_levels) {
  fresh_level();
  touch(SONG_DIR "/level.mp3");
  AudioSongFind(SONG_DIR "/level", &custom_level_audio_song);
  ASSERT_TRUE(AudioSongToPlay(1) != 0);
  ASSERT_TRUE(AudioSongToPlay(0) == 0);
  custom_level_audio_song.has_song = 0;
  ASSERT_TRUE(AudioSongToPlay(1) == 0);
}

UTEST(audio_song, a_song_plays_at_the_volume_next_to_it) {
  audio_song song;

  fresh_level();
  touch(SONG_DIR "/level.mp3");
  write_text(SONG_DIR "/level.volume", "150");
  AudioSongFind(SONG_DIR "/level", &song);
  ASSERT_EQ(150, song.volume);
}

UTEST(audio_song, a_song_without_a_volume_plays_at_100) {
  audio_song song;

  fresh_level();
  touch(SONG_DIR "/level.mp3");
  AudioSongFind(SONG_DIR "/level", &song);
  ASSERT_EQ(100, song.volume);
}

UTEST(audio_song, a_volume_out_of_its_range_or_not_a_number_plays_at_100) {
  const char *volumes[] = { "900", "10", "loud", "" };
  audio_song song;
  int i;

  for (i = 0; i < 4; i++) {
    fresh_level();
    touch(SONG_DIR "/level.mp3");
    write_text(SONG_DIR "/level.volume", volumes[i]);
    AudioSongFind(SONG_DIR "/level", &song);
    ASSERT_EQ(100, song.volume);
  }
}
