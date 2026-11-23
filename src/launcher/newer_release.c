/*
 * checking for a release newer than the launcher's version with c1x's tools
 * (c1x_tools check-update), and the newer release they say there is
 */
#include <SDL2/SDL.h>
#include "newer_release.h"
#include "tool_output.h"
#include "tools.h"

#define SUBCOMMAND_MAX 32
/* what the tools say before a newer release's version. updateCheck.ts has the
   same text, and one of its tests checks the two are the same */
#define NEWER_RELEASE "newer release: "

int IsReleaseVersion(const char *version) {
  size_t first, second;

  first = DigitCount(version);
  if (!first || version[first] != '.') { return 0; }
  second = DigitCount(version + first + 1);
  if (!second) { return 0; }
  return version[first + 1 + second] == 0; /* nothing after the second number */
}

int ReleaseToolsCommand(const char *repo, const char *subcommand,
  const char *version, char *command, size_t size) {
  char args[SUBCOMMAND_MAX + RELEASE_VERSION_MAX];

  if (!IsReleaseVersion(version)) { return 0; }
  if (SDL_strlen(version) >= RELEASE_VERSION_MAX) { return 0; }
  SDL_snprintf(args, sizeof(args), "%s %s", subcommand, version);
  return ToolsCommand(repo, args, command, size);
}

int NewerReleaseCommand(const char *repo, const char *version, char *command,
  size_t size) {
  return ReleaseToolsCommand(repo, "check-update", version, command, size);
}

int FindNewerRelease(const char *output, char *version, size_t size) {
  char found[RELEASE_VERSION_MAX];
  const char *rest;
  size_t length;

  rest = CompleteLineAfter(output, NEWER_RELEASE, &length);
  if (!rest) { return 0; }
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
