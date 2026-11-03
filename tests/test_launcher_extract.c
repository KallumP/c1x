#include "utest.h"
#include <sys/stat.h>
#ifdef _WIN32
#include <io.h>
#endif
#include "launcher/extract.h"

#define TEST_EXTRACT_REPO "build/test_launcher_extract"

static void MakeFolder(const char *path) {
#ifdef _WIN32
  mkdir(path);
#else
  mkdir(path, 0777);
#endif
}

static void MakeRepoWithNodeModules(void) {
  MakeFolder(TEST_EXTRACT_REPO);
  MakeFolder(TEST_EXTRACT_REPO "/tools");
  MakeFolder(TEST_EXTRACT_REPO "/tools/level_editor");
  MakeFolder(TEST_EXTRACT_REPO "/tools/level_editor/node_modules");
}

UTEST(launcher_extract, extracts_the_quoted_disc_image) {
  char command[512];

  MakeRepoWithNodeModules();
  ASSERT_TRUE(ExtractStreamsCommand(TEST_EXTRACT_REPO, "C:/games/crash 1.bin",
    command, sizeof(command)));
#ifdef _WIN32
  ASSERT_STREQ("npm run extract-streams -- \"C:/games/crash 1.bin\"", command);
#else
  ASSERT_STREQ("npm run extract-streams -- 'C:/games/crash 1.bin'", command);
#endif
}

UTEST(launcher_extract, installs_first_without_node_modules) {
  char command[512];

  ASSERT_TRUE(ExtractStreamsCommand("build/no_such_repo", "crash.bin",
    command, sizeof(command)));
#ifdef _WIN32
  ASSERT_STREQ("npm install && npm run extract-streams -- \"crash.bin\"", command);
#else
  ASSERT_STREQ("npm install && npm run extract-streams -- 'crash.bin'", command);
#endif
}

UTEST(launcher_extract, no_command_without_a_disc_image) {
  char command[512];

  ASSERT_FALSE(ExtractStreamsCommand(TEST_EXTRACT_REPO, "", command, sizeof(command)));
}

UTEST(launcher_extract, no_command_for_a_path_that_cant_be_quoted) {
  char command[512];

#ifdef _WIN32
  ASSERT_FALSE(ExtractStreamsCommand(TEST_EXTRACT_REPO, "crash\".bin", command, sizeof(command)));
#else
  ASSERT_FALSE(ExtractStreamsCommand(TEST_EXTRACT_REPO, "crash's.bin", command, sizeof(command)));
#endif
}
