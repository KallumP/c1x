/*
 * the pages of c1x's guide, for the launcher's Help tab: a release's own,
 * opened in the browser as file:/// addresses, or the docs on github in a
 * folder without them
 */
#include <SDL2/SDL.h>
#include "help.h"
#include "paths.h"

const help_page help_pages[HELP_PAGE_COUNT] = {
  { "Getting started", "README.html", "doc/release/README.md",
    "Getting the game's files, playing, and what's in c1x's folder." },
  { "Controls", "doc/controls.html", "doc/controls.md",
    "The keys to start with, and changing them." },
  { "Settings", "doc/settings.html", "doc/settings.md",
    "What each setting does." },
  { "Custom levels", "doc/custom_levels.html", "doc/custom_levels.md",
    "Playing the new levels, and making your own." },
  { "What's new", "doc/changelog.html", "doc/changelog.md",
    "What's changed in each version." },
};

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

void HelpPageAddress(const char *repo, const help_page *page, char *url, size_t size) {
  char path[PATH_MAX_LEN];

  JoinPath(path, sizeof(path), repo, page->release_page);
  if (!IsFileThere(path)) {
    SDL_snprintf(url, size, "%s%s", HELP_ONLINE_DOCS, page->repo_doc);
    return;
  }
  FileUrl(path, url, size);
}
