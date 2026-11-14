#include <string.h>
#include "utest.h"
#include "launcher/tools.h"
#include "test_files.h"

#define TEST_TOOLS_REPO "build/test_launcher_tools"

#ifdef _WIN32
#define TOOLS "c1x_tools.exe"
#else
#define TOOLS "c1x_tools"
#endif

UTEST(launcher_tools, the_tools_are_in_the_build_folder) {
  char path[256];

  ToolsPath("c1x", path, sizeof(path));
  ASSERT_STREQ("c1x/build/" TOOLS, path);
}

UTEST(launcher_tools, the_tools_are_built_once_theyre_there) {
  MakeFolder(TEST_TOOLS_REPO);
  MakeFolder(TEST_TOOLS_REPO "/build");
  remove(TEST_TOOLS_REPO "/build/" TOOLS);
  ASSERT_FALSE(AreToolsBuilt(TEST_TOOLS_REPO));
  WriteWholeFile(TEST_TOOLS_REPO "/build/" TOOLS, "");
  ASSERT_TRUE(AreToolsBuilt(TEST_TOOLS_REPO));
}

UTEST(launcher_tools, a_command_runs_the_tools_quoted_with_its_arguments) {
  char command[512];

  ASSERT_TRUE(ToolsCommand("C:/games/c1x", "editor", command, sizeof(command)));
#ifdef _WIN32
  ASSERT_STREQ("\"C:/games/c1x/build/" TOOLS "\" editor", command);
#else
  ASSERT_STREQ("'C:/games/c1x/build/" TOOLS "' editor", command);
#endif
}

UTEST(launcher_tools, no_command_for_a_repo_that_cant_be_quoted) {
  char command[512];

#ifdef _WIN32
  ASSERT_FALSE(ToolsCommand("c1\"x", "editor", command, sizeof(command)));
#else
  ASSERT_FALSE(ToolsCommand("c1'x", "editor", command, sizeof(command)));
#endif
}
