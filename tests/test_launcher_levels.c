#include "utest.h"
#include <sys/stat.h>
#ifdef _WIN32
#include <io.h>
#endif
#include "launcher/levels.h"

#define TEST_LEVELS_FOLDER "build/test_launcher_levels"

static void MakeFolder(const char *path) {
#ifdef _WIN32
  mkdir(path);
#else
  mkdir(path, 0777);
#endif
}

static void MakeEmptyFile(const char *name) {
  char path[256];
  FILE *file;

  snprintf(path, sizeof(path), "%s/%s", TEST_LEVELS_FOLDER, name);
  file = fopen(path, "wb");
  if (file) { fclose(file); }
}

UTEST(launcher_levels, lists_built_levels_by_name_in_order) {
  built_levels levels;

  MakeFolder(TEST_LEVELS_FOLDER);
  MakeEmptyFile("tide_ruins.nsd");
  MakeEmptyFile("tide_ruins.nsf");
  MakeEmptyFile("mossy_creek.nsd");
  MakeEmptyFile("mossy_creek.nsf");
  MakeEmptyFile("notes.txt");
  MakeEmptyFile("no spaces.nsd");
  ListBuiltLevels(TEST_LEVELS_FOLDER, &levels);
  ASSERT_EQ(2, levels.count);
  ASSERT_STREQ("mossy_creek", levels.names[0]);
  ASSERT_STREQ("tide_ruins", levels.names[1]);
}

UTEST(launcher_levels, no_levels_without_the_folder) {
  built_levels levels;

  ListBuiltLevels("build/no_such_levels_folder", &levels);
  ASSERT_EQ(0, levels.count);
}

UTEST(launcher_levels, finds_a_level_by_name) {
  built_levels levels;

  levels.count = 2;
  strcpy(levels.names[0], "mossy_creek");
  strcpy(levels.names[1], "tide_ruins");
  ASSERT_EQ(1, FindBuiltLevel(&levels, "tide_ruins"));
  ASSERT_EQ(-1, FindBuiltLevel(&levels, "facing_castle"));
}
