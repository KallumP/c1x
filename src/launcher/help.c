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

/* whether a file address can have c as it is: letters, digits, and - . _ ~ / : */
static int IsUrlSafe(char c) {
  return SDL_isalnum((unsigned char)c) || SDL_strchr("-._~/:", c);
}

/* how one character of a path goes in a file address, into text: backslashes
   as slashes, and anything that isn't safe in one escaped as %XX */
static const char *UrlCharacter(char c, char *text, size_t size) {
  if (c == '\\') { return "/"; }
  if (IsUrlSafe(c)) {
    text[0] = c;
    text[1] = 0;
    return text;
  }
  SDL_snprintf(text, size, "%%%02X", (unsigned char)c);
  return text;
}

void FileUrl(const char *path, char *url, size_t size) {
  char text[4];

  SDL_strlcpy(url, "file://", size);
  if (path[0] != '/' && path[0] != '\\') {
    SDL_strlcat(url, "/", size); /* a drive's path, C:/..., after the third slash */
  }
  for (; *path; path++) {
    SDL_strlcat(url, UrlCharacter(*path, text, sizeof(text)), size);
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
