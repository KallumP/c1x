#include "utest.h"
#include "launcher/level_editor.h"
#include "test_files.h"

#define TEST_EDITOR_REPO "build/test_launcher_level_editor"

UTEST(launcher_level_editor, is_in_the_tools_folder) {
  char folder[256];

  LevelEditorFolder("/home/me/c1x", folder, sizeof(folder));
  ASSERT_STREQ("/home/me/c1x/tools/level_editor", folder);
}

UTEST(launcher_level_editor, its_packages_are_installed_with_node_modules) {
  MakeRepoWithNodeModules(TEST_EDITOR_REPO);
  ASSERT_TRUE(AreLevelEditorPackagesInstalled(TEST_EDITOR_REPO));
}

UTEST(launcher_level_editor, its_packages_arent_installed_without) {
  ASSERT_FALSE(AreLevelEditorPackagesInstalled("build/no_such_repo"));
}
