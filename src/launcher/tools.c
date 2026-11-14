/*
 * c1x's tools (build/c1x_tools.exe): where they are, whether they're built,
 * and the commands running them
 */
#include <SDL2/SDL.h>
#include "paths.h"
#include "tools.h"

#ifdef _WIN32
#define QUOTE '"'  /* cmd.exe */
#else
#define QUOTE '\'' /* sh, which expands nothing in single quotes */
#endif

void ToolsPath(const char *repo, char *path, size_t size) {
  JoinPath(path, size, repo, "build/" TOOLS_FILE_NAME);
}

int AreToolsBuilt(const char *repo) {
  char path[PATH_MAX_LEN];
  SDL_RWops *file;

  ToolsPath(repo, path, sizeof(path));
  file = SDL_RWFromFile(path, "rb");
  if (!file) { return 0; }
  SDL_RWclose(file);
  return 1;
}

int ToolsCommand(const char *repo, const char *args, char *command, size_t size) {
  char path[PATH_MAX_LEN];

  ToolsPath(repo, path, sizeof(path));
  if (SDL_strchr(path, QUOTE)) { return 0; }
  SDL_snprintf(command, size, "%c%s%c %s", QUOTE, path, QUOTE, args);
  return 1;
}
