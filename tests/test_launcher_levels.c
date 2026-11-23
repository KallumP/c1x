#include <string.h>
#include <time.h>
#include <utime.h>
#include "utest.h"
#include "launcher/levels.h"
#include "test_files.h"

#define TEST_LEVELS_REPO "build/test_launcher_levels_repo"
#define TEST_BUILT TEST_LEVELS_REPO "/build/levels"
#define TEST_SOURCES TEST_LEVELS_REPO "/level_src"
#define TEST_MODIO_REPO "build/test_launcher_levels_modio"
#define TEST_MODIO_SOURCES TEST_MODIO_REPO "/level_src"

static void MakeEmptyFile(const char *folder, const char *name) {
  char path[256];

  snprintf(path, sizeof(path), "%s/%s", folder, name);
  WriteWholeFile(path, "");
}

static void MakeLevelsRepo(void) {
  MakeFolder(TEST_LEVELS_REPO);
  MakeFolder(TEST_LEVELS_REPO "/build");
  MakeFolder(TEST_BUILT);
  MakeFolder(TEST_SOURCES);
}

/* a level source's folder in level_src, with a map (a .obj) if with_map */
static void MakeLevelSource(const char *name, int with_map) {
  char folder[256];

  snprintf(folder, sizeof(folder), "%s/%s", TEST_SOURCES, name);
  MakeFolder(folder);
  MakeEmptyFile(folder, "objects.json");
  if (with_map) { MakeEmptyFile(folder, "map.obj"); }
}

static void MakeBuiltLevel(const char *name) {
  char file[128];

  snprintf(file, sizeof(file), "%s.nsd", name);
  MakeEmptyFile(TEST_BUILT, file);
  snprintf(file, sizeof(file), "%s.nsf", name);
  MakeEmptyFile(TEST_BUILT, file);
}

UTEST(launcher_levels, lists_built_levels_by_name_in_order) {
  custom_levels levels;

  MakeFolder("build/test_launcher_levels_built");
  MakeFolder("build/test_launcher_levels_built/build");
  MakeFolder("build/test_launcher_levels_built/build/levels");
  MakeEmptyFile("build/test_launcher_levels_built/build/levels", "tide_ruins.nsd");
  MakeEmptyFile("build/test_launcher_levels_built/build/levels", "mossy_creek.nsd");
  MakeEmptyFile("build/test_launcher_levels_built/build/levels", "notes.txt");
  MakeEmptyFile("build/test_launcher_levels_built/build/levels", "no spaces.nsd");
  ListCustomLevels("build/test_launcher_levels_built", &levels);
  ASSERT_EQ(2, levels.count);
  ASSERT_STREQ("mossy_creek", levels.names[0]);
  ASSERT_TRUE(levels.built[0]);
  ASSERT_STREQ("tide_ruins", levels.names[1]);
}

UTEST(launcher_levels, lists_level_sources_not_yet_built) {
  custom_levels levels;

  MakeLevelsRepo();
  MakeLevelSource("sunset_canyon", 1);
  MakeLevelSource("acid_cave", 1);
  MakeBuiltLevel("acid_cave");
  ListCustomLevels(TEST_LEVELS_REPO, &levels);
  ASSERT_EQ(0, FindCustomLevel(&levels, "acid_cave"));
  ASSERT_TRUE(levels.built[0]);
  ASSERT_EQ(1, FindCustomLevel(&levels, "sunset_canyon"));
  ASSERT_FALSE(levels.built[1]);
}

#define SOURCE_TIME 1000 /* seconds since 1970: the sources were saved, then the level built */
#define BUILT_TIME 2000
#define EDITED_TIME 3000

static void SetFileTime(const char *folder, const char *name, time_t when) {
  char path[256];
  struct utimbuf times = { when, when };

  snprintf(path, sizeof(path), "%s/%s", folder, name);
  utime(path, &times);
}

/* tide_ruins, its sources saved before it was built */
static void MakeBuiltLevelWithSource(void) {
  MakeLevelsRepo();
  MakeLevelSource("tide_ruins", 1);
  MakeBuiltLevel("tide_ruins");
  SetFileTime(TEST_SOURCES "/tide_ruins", "objects.json", SOURCE_TIME);
  SetFileTime(TEST_SOURCES "/tide_ruins", "map.obj", SOURCE_TIME);
  SetFileTime(TEST_BUILT, "tide_ruins.nsd", BUILT_TIME);
}

UTEST(launcher_levels, a_level_built_after_its_sources_is_up_to_date) {
  custom_levels levels;

  MakeBuiltLevelWithSource();
  ListCustomLevels(TEST_LEVELS_REPO, &levels);
  ASSERT_FALSE(levels.out_of_date[FindCustomLevel(&levels, "tide_ruins")]);
}

UTEST(launcher_levels, a_source_saved_after_the_build_makes_it_out_of_date) {
  custom_levels levels;

  MakeBuiltLevelWithSource();
  SetFileTime(TEST_SOURCES "/tide_ruins", "objects.json", EDITED_TIME);
  ListCustomLevels(TEST_LEVELS_REPO, &levels);
  ASSERT_TRUE(levels.out_of_date[FindCustomLevel(&levels, "tide_ruins")]);
}

UTEST(launcher_levels, a_blend_file_saved_after_the_build_doesnt_count) {
  custom_levels levels;

  MakeBuiltLevelWithSource();
  MakeEmptyFile(TEST_SOURCES "/tide_ruins", "tide_ruins.blend");
  SetFileTime(TEST_SOURCES "/tide_ruins", "tide_ruins.blend", EDITED_TIME);
  ListCustomLevels(TEST_LEVELS_REPO, &levels);
  ASSERT_FALSE(levels.out_of_date[FindCustomLevel(&levels, "tide_ruins")]);
}

UTEST(launcher_levels, an_unbuilt_level_isnt_out_of_date) {
  custom_levels levels;

  MakeLevelsRepo();
  MakeLevelSource("wave_point", 1);
  ListCustomLevels(TEST_LEVELS_REPO, &levels);
  ASSERT_FALSE(levels.out_of_date[FindCustomLevel(&levels, "wave_point")]);
}

UTEST(launcher_levels, a_level_built_and_with_a_source_is_listed_once) {
  custom_levels levels;
  int i, seen = 0;

  MakeLevelsRepo();
  MakeLevelSource("tide_ruins", 1);
  MakeBuiltLevel("tide_ruins");
  ListCustomLevels(TEST_LEVELS_REPO, &levels);
  for (i = 0; i < levels.count; i++) {
    if (strcmp(levels.names[i], "tide_ruins") == 0) { seen++; }
  }
  ASSERT_EQ(1, seen);
}

UTEST(launcher_levels, a_folder_without_a_map_isnt_a_level_source) {
  custom_levels levels;

  MakeLevelsRepo();
  MakeLevelSource("half_made", 0);
  MakeEmptyFile(TEST_SOURCES, "README.md");
  ListCustomLevels(TEST_LEVELS_REPO, &levels);
  ASSERT_EQ(-1, FindCustomLevel(&levels, "half_made"));
  ASSERT_EQ(-1, FindCustomLevel(&levels, "README"));
}

UTEST(launcher_levels, a_source_the_game_cant_boot_isnt_listed) {
  custom_levels levels;

  MakeLevelsRepo();
  MakeLevelSource("has space", 1);
  ListCustomLevels(TEST_LEVELS_REPO, &levels);
  ASSERT_EQ(-1, FindCustomLevel(&levels, "has space"));
}

UTEST(launcher_levels, no_levels_without_the_folders) {
  custom_levels levels;

  ListCustomLevels("build/no_such_repo", &levels);
  ASSERT_EQ(0, levels.count);
}

UTEST(launcher_levels, finds_a_level_by_name) {
  custom_levels levels;

  levels.count = 2;
  strcpy(levels.names[0], "mossy_creek");
  strcpy(levels.names[1], "tide_ruins");
  ASSERT_EQ(1, FindCustomLevel(&levels, "tide_ruins"));
  ASSERT_EQ(-1, FindCustomLevel(&levels, "facing_castle"));
}

/* one level, called tide_ruins, built or not and out of date or not */
static void MakeOneLevel(custom_levels *levels, int built, int out_of_date) {
  levels->count = 1;
  strcpy(levels->names[0], "tide_ruins");
  levels->built[0] = built;
  levels->out_of_date[0] = out_of_date;
}

UTEST(launcher_levels, statuses_say_whether_built_and_up_to_date) {
  custom_levels levels;

  MakeOneLevel(&levels, 0, 0);
  ASSERT_STREQ("not built", CustomLevelStatus(&levels, 0));
  MakeOneLevel(&levels, 1, 0);
  ASSERT_STREQ("built", CustomLevelStatus(&levels, 0));
  MakeOneLevel(&levels, 1, 1);
  ASSERT_STREQ("out of date", CustomLevelStatus(&levels, 0));
}

UTEST(launcher_levels, a_built_levels_label_is_its_name) {
  custom_levels levels;
  char label[64];

  levels.count = 1;
  strcpy(levels.names[0], "tide_ruins");
  levels.built[0] = 1;
  CustomLevelLabel(&levels, 0, label, sizeof(label));
  ASSERT_STREQ("tide_ruins", label);
}

UTEST(launcher_levels, an_unbuilt_levels_label_says_so) {
  custom_levels levels;
  char label[64];

  levels.count = 1;
  strcpy(levels.names[0], "sunset_canyon");
  levels.built[0] = 0;
  CustomLevelLabel(&levels, 0, label, sizeof(label));
  ASSERT_STREQ("sunset_canyon (not built)", label);
}

UTEST(launcher_levels, the_level_sources_folder_opens_as_a_file_url) {
  char url[256];

  LevelSourcesFolderUrl("C:/games/c1x", url, sizeof(url));
  ASSERT_STREQ("file:///C:/games/c1x/level_src", url);
}

/* a level source called name in its own repo, kept apart from the other tests'
   levels, and its .modio.json saying note, if there is one (note isn't 0) */
static void MakeDownloadedLevel(const char *name, const char *note) {
  char path[256];

  MakeFolder(TEST_MODIO_REPO);
  MakeFolder(TEST_MODIO_SOURCES);
  snprintf(path, sizeof(path), "%s/%s", TEST_MODIO_SOURCES, name);
  MakeFolder(path);
  MakeEmptyFile(path, "map.obj");
  if (!note) { return; }
  snprintf(path, sizeof(path), "%s/%s/.modio.json", TEST_MODIO_SOURCES, name);
  WriteWholeFile(path, note);
}

/* the mod.io page the launcher lists for the level source called name */
static const char *ModioPageOf(custom_levels *levels, const char *name) {
  ListCustomLevels(TEST_MODIO_REPO, levels);
  return levels->modio_pages[FindCustomLevel(levels, name)];
}

UTEST(launcher_levels, a_level_downloaded_from_mod_io_has_its_page) {
  static custom_levels levels;

  MakeDownloadedLevel("tide_ruins",
    "{\"modId\":17302,\"page\":\"https://mod.io/g/c1x/m/tide-ruins\"}");
  ASSERT_STREQ("https://mod.io/g/c1x/m/tide-ruins", ModioPageOf(&levels, "tide_ruins"));
}

UTEST(launcher_levels, a_level_of_your_own_has_no_mod_io_page) {
  static custom_levels levels;

  MakeDownloadedLevel("my_level", 0);
  ASSERT_STREQ("", ModioPageOf(&levels, "my_level"));
}

UTEST(launcher_levels, a_mod_io_note_without_a_page_has_none) {
  static custom_levels levels;

  MakeDownloadedLevel("old_download", "{\"modId\":17302}");
  ASSERT_STREQ("", ModioPageOf(&levels, "old_download"));
}

UTEST(launcher_levels, a_mod_io_page_with_a_backslash_is_none) {
  static custom_levels levels;

  MakeDownloadedLevel("escaped_page", "{\"modId\":1,\"page\":\"https:\\/\\/mod.io\\/m\"}");
  ASSERT_STREQ("", ModioPageOf(&levels, "escaped_page"));
}

UTEST(launcher_levels, a_mod_io_page_with_no_end_is_none) {
  static custom_levels levels;

  MakeDownloadedLevel("cut_page", "{\"modId\":1,\"page\":\"https://mod.io/m");
  ASSERT_STREQ("", ModioPageOf(&levels, "cut_page"));
}

UTEST(launcher_levels, a_mod_io_page_too_long_to_keep_is_none) {
  static custom_levels levels;
  static char note[MODIO_PAGE_MAX + 64];

  snprintf(note, sizeof(note), "{\"modId\":1,\"page\":\"https://mod.io/%0*d\"}",
    MODIO_PAGE_MAX, 0);
  MakeDownloadedLevel("long_page", note);
  ASSERT_STREQ("", ModioPageOf(&levels, "long_page"));
}
