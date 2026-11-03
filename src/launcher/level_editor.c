/*
 * the level editor and the tools beside it, in tools/level_editor, which
 * need their npm packages installed
 */
#include <sys/stat.h>
#include "level_editor.h"
#include "paths.h"

void LevelEditorFolder(const char *repo, char *folder, size_t size) {
  JoinPath(folder, size, repo, "tools/level_editor");
}

static int IsFolder(const char *path) {
  struct stat info;

  return stat(path, &info) == 0 && S_ISDIR(info.st_mode);
}

int AreLevelEditorPackagesInstalled(const char *repo) {
  char folder[PATH_MAX_LEN];
  char node_modules[PATH_MAX_LEN];

  LevelEditorFolder(repo, folder, sizeof(folder));
  JoinPath(node_modules, sizeof(node_modules), folder, "node_modules");
  return IsFolder(node_modules);
}
