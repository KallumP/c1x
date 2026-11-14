#include <string.h>
#include "utest.h"
#include "launcher/level_build.h"

#ifdef _WIN32
#define TOOLS "c1x_tools.exe"
#else
#define TOOLS "c1x_tools"
#endif

UTEST(launcher_level_build, builds_the_level_with_the_tools) {
  char command[512];

  ASSERT_TRUE(BuildLevelCommand("C:/games/c1x", "tide_ruins", command, sizeof(command)));
#ifdef _WIN32
  ASSERT_STREQ("\"C:/games/c1x/build/" TOOLS "\" build-level tide_ruins", command);
#else
  ASSERT_STREQ("'C:/games/c1x/build/" TOOLS "' build-level tide_ruins", command);
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
