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
