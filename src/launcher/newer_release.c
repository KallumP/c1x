/*
 * checking for a release newer than the launcher's version with c1x's tools
 * (c1x_tools check-update), and the newer release they say there is
 */
#include <SDL2/SDL.h>
#include "newer_release.h"
#include "tools.h"

#define CHECK_ARGS_MAX 64
/* what the tools say before a newer release's version and its page (updateCheck.ts) */
#define NEWER_RELEASE "newer release: "

/* the number at text, moved past it; returns 0 if there isn't one */
static int SkipNumber(const char **text) {
  const char *start = *text;

  while (SDL_isdigit(**text)) { (*text)++; }
  return *text != start;
}

/* whether version is two numbers with a dot between, like 1.3 */
int IsReleaseVersion(const char *version) {
  if (!SkipNumber(&version) || *version++ != '.') { return 0; }
  return SkipNumber(&version) && !*version;
}

int NewerReleaseCommand(const char *repo, const char *version, char *command,
  size_t size) {
  char args[CHECK_ARGS_MAX];

  if (!IsReleaseVersion(version)) { return 0; }
  SDL_snprintf(args, sizeof(args), "check-update %s", version);
  return ToolsCommand(repo, args, command, size);
}

int FindNewerRelease(const char *output, char *version, size_t size) {
  return 0;
}

void VersionLabel(const char *version, char *label, size_t size) {
  label[0] = 0;
}
