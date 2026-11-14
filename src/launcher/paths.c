/*
 * paths for the launcher, which lives in the repo's top folder and works
 * on that folder, whatever folder it's started from
 */
#include <SDL2/SDL.h>
#include "paths.h"

static int IsSeparator(char c) {
  return c == '/' || c == '\\';
}

/* launcher_folder (the launcher's own, e.g. ".../c1x/") without its trailing separators */
void RepoFolderFromLauncherFolder(const char *launcher_folder, char *repo, size_t size) {
  size_t len;

  SDL_strlcpy(repo, launcher_folder, size);
  len = SDL_strlen(repo);
  while (len > 1 && IsSeparator(repo[len-1])) { len--; }
  repo[len] = 0;
}

/* folder/name, without doubling a separator folder ends with */
void JoinPath(char *path, size_t size, const char *folder, const char *name) {
  size_t len;

  len = SDL_strlen(folder);
  if (len > 0 && IsSeparator(folder[len-1])) {
    SDL_snprintf(path, size, "%s%s", folder, name);
  }
  else {
    SDL_snprintf(path, size, "%s/%s", folder, name);
  }
}

/* the repo folder, from the launcher's own path; returns 0 if it can't tell */
int FindRepoFolder(char *repo, size_t size) {
  char *launcher_folder;

  launcher_folder = SDL_GetBasePath();
  if (!launcher_folder) { return 0; }
  RepoFolderFromLauncherFolder(launcher_folder, repo, size);
  SDL_free(launcher_folder);
  return 1;
}
