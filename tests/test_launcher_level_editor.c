#include "utest.h"
#include <sys/stat.h>
#ifdef _WIN32
#include <io.h>
#endif
#include "launcher/level_editor.h"

#define TEST_EDITOR_REPO "build/test_launcher_level_editor"

static void MakeFolder(const char *path) {
#ifdef _WIN32
  mkdir(path);
#else
  mkdir(path, 0777);
#endif
}

UTEST(launcher_level_editor, is_in_the_tools_folder) {
  char folder[256];

  LevelEditorFolder("/home/me/c1x", folder, sizeof(folder));
  ASSERT_STREQ("/home/me/c1x/tools/level_editor", folder);
}

UTEST(launcher_level_editor, its_packages_are_installed_with_node_modules) {
  MakeFolder(TEST_EDITOR_REPO);
  MakeFolder(TEST_EDITOR_REPO "/tools");
  MakeFolder(TEST_EDITOR_REPO "/tools/level_editor");
  MakeFolder(TEST_EDITOR_REPO "/tools/level_editor/node_modules");
  ASSERT_TRUE(AreLevelEditorPackagesInstalled(TEST_EDITOR_REPO));
}

UTEST(launcher_level_editor, its_packages_arent_installed_without) {
  ASSERT_FALSE(AreLevelEditorPackagesInstalled("build/no_such_repo"));
}
