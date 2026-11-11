/*
 * building a custom level with build-level (build/build-level.exe), the
 * level build with node built in, so the launcher builds levels without node
 */
#include <SDL2/SDL.h>
#include "level_build.h"
#include "paths.h"

#ifdef _WIN32
#define QUOTE '"'  /* cmd.exe */
#else
#define QUOTE '\'' /* sh, which expands nothing in single quotes */
#endif

void BuilderPath(const char *repo, char *path, size_t size) {
  JoinPath(path, size, repo, "build/" BUILDER_FILE_NAME);
}

int IsBuilderBuilt(const char *repo) {
  char path[PATH_MAX_LEN];
  SDL_RWops *file;

  BuilderPath(repo, path, sizeof(path));
  file = SDL_RWFromFile(path, "rb");
  if (!file) { return 0; }
  SDL_RWclose(file);
  return 1;
}

/* levels are named as boot_level takes them, with nothing to quote */
int BuildLevelCommand(const char *repo, const char *level, char *command,
  size_t size) {
  char path[PATH_MAX_LEN];

  if (!level[0]) { return 0; }
  BuilderPath(repo, path, sizeof(path));
  if (SDL_strchr(path, QUOTE)) { return 0; }
  SDL_snprintf(command, size, "%c%s%c %s", QUOTE, path, QUOTE, level);
  return 1;
}
