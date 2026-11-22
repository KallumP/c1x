/*
 * checking for a release newer than the launcher's version with c1x's tools
 * (c1x_tools check-update), and the newer release they say there is
 */
#include <SDL2/SDL.h>
#include "newer_release.h"
#include "tools.h"

#define CHECK_COMMAND "check-update "
#define CHECK_ARGS_MAX (sizeof(CHECK_COMMAND) + RELEASE_VERSION_MAX)
/* what the tools say before a newer release's version. updateCheck.ts has the
   same text, and one of its tests checks the two are the same */
#define NEWER_RELEASE "newer release: "

/* how many digits text starts with */
static size_t DigitCount(const char *text) {
  size_t count = 0;

  while (SDL_isdigit(text[count])) { count++; }
  return count;
}

int IsReleaseVersion(const char *version) {
  size_t first, second;

  first = DigitCount(version);
  if (!first || version[first] != '.') { return 0; }
  second = DigitCount(version + first + 1);
  if (!second) { return 0; }
  return version[first + 1 + second] == 0; /* nothing after the second number */
}

int NewerReleaseCommand(const char *repo, const char *version, char *command,
  size_t size) {
  char args[CHECK_ARGS_MAX];

  if (!IsReleaseVersion(version)) { return 0; }
  if (SDL_strlen(version) >= RELEASE_VERSION_MAX) { return 0; }
  SDL_snprintf(args, sizeof(args), CHECK_COMMAND "%s", version);
  return ToolsCommand(repo, args, command, size);
}

/* how many characters text has before its line ends, or it does */
static size_t LineLength(const char *text) {
  size_t length = 0;

  while (text[length] && text[length] != '\r' && text[length] != '\n') { length++; }
  return length;
}

int FindNewerRelease(const char *output, char *version, size_t size) {
  char found[RELEASE_VERSION_MAX];
  const char *line, *rest;
  size_t length;

  line = SDL_strstr(output, NEWER_RELEASE);
  if (!line) { return 0; }
  rest = line + SDL_strlen(NEWER_RELEASE); /* the version, to the line's end */
  length = LineLength(rest);
  if (!rest[length]) { return 0; } /* no line end yet: more of it may be to come */
  if (length >= sizeof(found) || length >= size) { return 0; }
  SDL_strlcpy(found, rest, length + 1);
  if (!IsReleaseVersion(found)) { return 0; }
  SDL_strlcpy(version, found, size);
  return 1;
}

void VersionLabel(const char *version, char *label, size_t size) {
  if (!version[0]) {
    SDL_strlcpy(label, "dev build", size);
    return;
  }
  SDL_snprintf(label, size, "v%s", version);
}
