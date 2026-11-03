/*
 * extracting the game's files into streams/ from a disc image, with the
 * level editor's npm run extract-streams
 */
#include <SDL2/SDL.h>
#include <sys/stat.h>
#include "extract.h"
#include "paths.h"

#ifdef _WIN32
#define QUOTE '"'  /* cmd.exe */
#else
#define QUOTE '\'' /* sh, which expands nothing in single quotes */
#endif

/* the folder npm runs in: the level editor's, which has the script */
void ExtractStreamsFolder(const char *repo, char *folder, size_t size) {
  JoinPath(folder, size, repo, "tools/level_editor");
}

static int IsFolder(const char *path) {
  struct stat info;

  return stat(path, &info) == 0 && S_ISDIR(info.st_mode);
}

static int AreNodeModulesInstalled(const char *repo) {
  char folder[PATH_MAX_LEN];
  char node_modules[PATH_MAX_LEN];

  ExtractStreamsFolder(repo, folder, sizeof(folder));
  JoinPath(node_modules, sizeof(node_modules), folder, "node_modules");
  return IsFolder(node_modules);
}

/* the command extracting image's files, installing the script's packages
   first if need be; returns 0 for no image, or one that can't be quoted */
int ExtractStreamsCommand(const char *repo, const char *image, char *command,
  size_t size) {
  const char *install;

  if (!image[0] || SDL_strchr(image, QUOTE)) { return 0; }
  install = AreNodeModulesInstalled(repo) ? "" : "npm install && ";
  SDL_snprintf(command, size, "%snpm run extract-streams -- %c%s%c",
    install, QUOTE, image, QUOTE);
  return 1;
}
