#include <stdio.h>
#include <sys/stat.h>
#ifdef _WIN32
#include <io.h>
#endif
#include "test_files.h"

void MakeFolder(const char *path) {
#ifdef _WIN32
  mkdir(path);
#else
  mkdir(path, 0777);
#endif
}

void MakeRepoWithNodeModules(const char *repo) {
  char path[256];

  MakeFolder(repo);
  snprintf(path, sizeof(path), "%s/tools", repo);
  MakeFolder(path);
  snprintf(path, sizeof(path), "%s/tools/level_editor", repo);
  MakeFolder(path);
  snprintf(path, sizeof(path), "%s/tools/level_editor/node_modules", repo);
  MakeFolder(path);
}
