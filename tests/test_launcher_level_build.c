#include <string.h>
#include "utest.h"
#include "launcher/level_build.h"
#include "test_files.h"

#define TEST_BUILD_REPO "build/test_launcher_level_build"

#ifdef _WIN32
#define BUILDER "build-level.exe"
#else
#define BUILDER "build-level"
#endif

UTEST(launcher_level_build, the_builder_is_in_the_build_folder) {
  char path[256];

  BuilderPath("c1x", path, sizeof(path));
  ASSERT_STREQ("c1x/build/" BUILDER, path);
}

UTEST(launcher_level_build, the_builder_is_built_once_its_there) {
  MakeFolder(TEST_BUILD_REPO);
  MakeFolder(TEST_BUILD_REPO "/build");
  remove(TEST_BUILD_REPO "/build/" BUILDER);
  ASSERT_FALSE(IsBuilderBuilt(TEST_BUILD_REPO));
  WriteWholeFile(TEST_BUILD_REPO "/build/" BUILDER, "");
  ASSERT_TRUE(IsBuilderBuilt(TEST_BUILD_REPO));
}

UTEST(launcher_level_build, builds_the_level_with_the_builder) {
  char command[512];

  ASSERT_TRUE(BuildLevelCommand("C:/games/c1x", "tide_ruins", command, sizeof(command)));
#ifdef _WIN32
  ASSERT_STREQ("\"C:/games/c1x/build/" BUILDER "\" tide_ruins", command);
#else
  ASSERT_STREQ("'C:/games/c1x/build/" BUILDER "' tide_ruins", command);
#endif
}

UTEST(launcher_level_build, no_command_without_a_level) {
  char command[512];

  ASSERT_FALSE(BuildLevelCommand("c1x", "", command, sizeof(command)));
}

UTEST(launcher_level_build, no_command_for_a_repo_that_cant_be_quoted) {
  char command[512];

#ifdef _WIN32
  ASSERT_FALSE(BuildLevelCommand("c1\"x", "tide_ruins", command, sizeof(command)));
#else
  ASSERT_FALSE(BuildLevelCommand("c1'x", "tide_ruins", command, sizeof(command)));
#endif
}
