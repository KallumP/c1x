/*
 * downloading a newer release with c1x's tools (c1x_tools download-release),
 * and where they say they saved it
 */
#include <SDL2/SDL.h>
#include "release_download.h"
#include "newer_release.h"
#include "tool_output.h"
#include "tools.h"

#define DOWNLOAD_COMMAND "download-release "
#define DOWNLOAD_ARGS_MAX (sizeof(DOWNLOAD_COMMAND) + RELEASE_VERSION_MAX)
/* what the tools say before where they saved the release. releaseDownload.ts
   has the same text, and one of its tests checks the two are the same */
#define RELEASE_SAVED "saved release: "

int DownloadReleaseCommand(const char *repo, const char *version, char *command,
  size_t size) {
  char args[DOWNLOAD_ARGS_MAX];

  if (!IsReleaseVersion(version)) { return 0; }
  if (SDL_strlen(version) >= RELEASE_VERSION_MAX) { return 0; }
  SDL_snprintf(args, sizeof(args), DOWNLOAD_COMMAND "%s", version);
  return ToolsCommand(repo, args, command, size);
}

int FindSavedRelease(const char *output, char *path, size_t size) {
  const char *line;
  size_t length;

  line = SDL_strstr(output, RELEASE_SAVED);
  if (!line) { return 0; }
  line += SDL_strlen(RELEASE_SAVED);
  length = LineLength(line);
  if (!line[length]) { return 0; } /* no line end yet: more of it may be to come */
  if (length >= size) { return 0; }
  return CopyWhole(path, size, line, length);
}
