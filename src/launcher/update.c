/*
 * checking for a release newer than the launcher's version with c1x's tools
 * (c1x_tools check-update), and the newer release they say there is
 */
#include <SDL2/SDL.h>
#include "update.h"
#include "tools.h"

#define CHECK_ARGS_MAX 64
/* what the tools say before a newer release's version and its page (updateCheck.ts) */
#define NEWER_RELEASE "newer release: "
/* where c1x's releases are: the only pages the launcher opens from the check */
#define RELEASES_PAGE "https://github.com/KallumP/c1x/releases/"

/* the number at text, moved past it; returns 0 if there isn't one */
static int SkipNumber(const char **text) {
  const char *start = *text;

  while (SDL_isdigit(**text)) { (*text)++; }
  return *text != start;
}

/* whether version is two numbers with a dot between, like 1.3 */
static int IsReleaseVersion(const char *version) {
  if (!SkipNumber(&version) || *version++ != '.') { return 0; }
  return SkipNumber(&version) && !*version;
}

int UpdateCheckCommand(const char *repo, const char *version, char *command,
  size_t size) {
  char args[CHECK_ARGS_MAX];

  if (!IsReleaseVersion(version)) { return 0; }
  SDL_snprintf(args, sizeof(args), "check-update %s", version);
  return ToolsCommand(repo, args, command, size);
}

/* copies the word at text (up to a space or the line's end) into word, and
   returns what's after it; 0 if it doesn't fit */
static const char *ReadWord(const char *text, char *word, size_t size) {
  size_t length = 0;

  while (text[length] && !SDL_isspace(text[length])) { length++; }
  if (length >= size) { return 0; }
  SDL_strlcpy(word, text, length + 1);
  return text + length;
}

int FindNewerRelease(const char *output, newer_release *release) {
  const char *text;

  text = SDL_strstr(output, NEWER_RELEASE);
  if (!text) { return 0; }
  text = ReadWord(text + SDL_strlen(NEWER_RELEASE), release->version, sizeof(release->version));
  if (!text || *text != ' ') { return 0; }
  text = ReadWord(text + 1, release->address, sizeof(release->address));
  if (!text || !*text) { return 0; } /* no line end yet: the rest is still to come */
  return IsReleaseVersion(release->version)
    && SDL_strncmp(release->address, RELEASES_PAGE, SDL_strlen(RELEASES_PAGE)) == 0;
}
