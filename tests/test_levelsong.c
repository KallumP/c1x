#include <stdio.h>
#include <string.h>
#include "utest.h"
#include "pc/levelsong.h"
#include "test_files.h"

#define TEST_SONG_LEVELS "build/test_level_song"

/* a built level's files in TEST_SONG_LEVELS: its song files named by extensions (each a suffix, such as ".mid") */
static void MakeSongFiles(const char *name, const char **suffixes, int count) {
  char path[256];
  int i;

  MakeFolder(TEST_SONG_LEVELS);
  for (i = 0; i < count; i++) {
    snprintf(path, sizeof(path), "%s/%s%s", TEST_SONG_LEVELS, name, suffixes[i]);
    WriteWholeFile(path, "song");
  }
}

UTEST(levelsong, finds_a_levels_song_its_aku_aku_song_and_its_instruments) {
  const char *suffixes[] = { ".mid", "_aku.mid", ".sf2" };
  level_song song;

  MakeSongFiles("all_three", suffixes, 3);
  LevelSongFind(TEST_SONG_LEVELS "/all_three", &song);
  ASSERT_TRUE(song.has_mid);
  ASSERT_TRUE(song.has_aku_mid);
  ASSERT_TRUE(song.has_sf2);
  ASSERT_STREQ(TEST_SONG_LEVELS "/all_three.mid", song.mid);
  ASSERT_STREQ(TEST_SONG_LEVELS "/all_three_aku.mid", song.aku_mid);
  ASSERT_STREQ(TEST_SONG_LEVELS "/all_three.sf2", song.sf2);
}

UTEST(levelsong, a_level_with_just_a_song) {
  const char *suffixes[] = { ".mid" };
  level_song song;

  MakeSongFiles("just_mid", suffixes, 1);
  LevelSongFind(TEST_SONG_LEVELS "/just_mid", &song);
  ASSERT_TRUE(song.has_mid);
  ASSERT_FALSE(song.has_aku_mid);
  ASSERT_FALSE(song.has_sf2);
}

UTEST(levelsong, a_level_without_a_song_has_none_even_with_instruments) {
  const char *suffixes[] = { ".sf2" };
  level_song song;

  MakeSongFiles("no_mid", suffixes, 1);
  LevelSongFind(TEST_SONG_LEVELS "/no_mid", &song);
  ASSERT_FALSE(song.has_mid);
  ASSERT_FALSE(LevelSongIsOwn(&song));
}

UTEST(levelsong, a_level_with_a_song_plays_its_own) {
  const char *suffixes[] = { ".mid" };
  level_song song;

  MakeSongFiles("own", suffixes, 1);
  LevelSongFind(TEST_SONG_LEVELS "/own", &song);
  ASSERT_TRUE(LevelSongIsOwn(&song));
}

/* a level_song with the files given, without looking for them */
static level_song SongWith(int has_mid, int has_aku_mid, int has_sf2) {
  level_song song;

  memset(&song, 0, sizeof(song));
  song.has_mid = has_mid;
  song.has_aku_mid = has_aku_mid;
  song.has_sf2 = has_sf2;
  return song;
}

UTEST(levelsong, its_own_song_is_one_track_or_two_with_aku_akus_song) {
  level_song just_song = SongWith(1, 0, 0), with_aku = SongWith(1, 1, 0);

  ASSERT_EQ(1, LevelSongTrackCount(&just_song, 2));
  ASSERT_EQ(2, LevelSongTrackCount(&with_aku, 1));
}

UTEST(levelsong, without_its_own_song_the_musics_tracks_stay) {
  level_song none = SongWith(0, 0, 1);

  ASSERT_EQ(2, LevelSongTrackCount(&none, 2));
  ASSERT_EQ(2, LevelSongTrackCount(0, 2));
}

UTEST(levelsong, only_a_custom_level_plays_its_own_song) {
  custom_level_song = SongWith(1, 0, 0);
  ASSERT_TRUE(LevelSongToPlay(1) == &custom_level_song);
  ASSERT_TRUE(LevelSongToPlay(0) == 0);
  custom_level_song = SongWith(0, 0, 1);
  ASSERT_TRUE(LevelSongToPlay(1) == 0);
  memset(&custom_level_song, 0, sizeof(custom_level_song));
}

UTEST(levelsong, a_song_file_is_read_whole) {
  uint8_t *data;
  size_t size;

  MakeFolder(TEST_SONG_LEVELS);
  WriteWholeFile(TEST_SONG_LEVELS "/read.mid", "MThd1234");
  data = LevelSongReadFile(TEST_SONG_LEVELS "/read.mid", &size);
  ASSERT_TRUE(data != 0);
  ASSERT_EQ((size_t)8, size);
  ASSERT_EQ(0, memcmp(data, "MThd1234", 8));
  free(data);
}

UTEST(levelsong, a_missing_song_file_reads_as_nothing) {
  size_t size;

  ASSERT_TRUE(LevelSongReadFile(TEST_SONG_LEVELS "/missing.mid", &size) == 0);
}
