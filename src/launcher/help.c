/*
 * the launcher's Help: a release's README.html, opened in the browser as a
 * file:/// address, or the docs on github in a folder without one
 */
#include <SDL2/SDL.h>
#include "help.h"
#include "paths.h"

#define README_PAGE "README.html"

/* how one character of a path goes in a file address */
static const char *UrlCharacter(char c, char *one) {
  if (c == '\\') { return "/"; }
  if (c == ' ') { return "%20"; }
  if (c == '#') { return "%23"; }
  if (c == '%') { return "%25"; }
  one[0] = c;
  one[1] = 0;
  return one;
}

void FileUrl(const char *path, char *url, size_t size) {
  char one[2];

  SDL_strlcpy(url, "file://", size);
  if (path[0] != '/' && path[0] != '\\') {
    SDL_strlcat(url, "/", size); /* a drive's path, C:/..., after the third slash */
  }
  for (; *path; path++) {
    SDL_strlcat(url, UrlCharacter(*path, one), size);
  }
}

static int IsFileThere(const char *path) {
  SDL_RWops *file = SDL_RWFromFile(path, "rb");

  if (!file) { return 0; }
  SDL_RWclose(file);
  return 1;
}

void HelpAddress(const char *repo, char *url, size_t size) {
  char path[PATH_MAX_LEN];

  JoinPath(path, sizeof(path), repo, README_PAGE);
  if (!IsFileThere(path)) {
    SDL_strlcpy(url, HELP_ONLINE_ADDRESS, size);
    return;
  }
  FileUrl(path, url, size);
}
