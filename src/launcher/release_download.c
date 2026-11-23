/*
 * downloading a newer release with c1x's tools (c1x_tools download-release),
 * and where they say they put its folder
 */
#include <SDL2/SDL.h>
#include "release_download.h"
#include "newer_release.h"
#include "paths.h"
#include "process.h"
#include "tool_output.h"
#include "tools.h"

#ifdef _WIN32
#define LAUNCHER_FILE_NAME "c1x_launcher.exe"
#else
#define LAUNCHER_FILE_NAME "c1x_launcher"
#endif

/* what the tools say before the new version's folder. releaseDownload.ts
   has the same text, and one of its tests checks the two are the same */
#define INSTALLED_PREFIX "installed release: "

int DownloadReleaseCommand(const char *repo, const char *version, char *command,
  size_t size) {
  return ReleaseToolsCommand(repo, "download-release", version, command, size);
}

int FindInstalledRelease(const char *output, char *folder, size_t size) {
  const char *rest;
  size_t length;

  rest = CompleteLineAfter(output, INSTALLED_PREFIX, &length);
  if (!rest || length >= size) { return 0; }
  return CopyWhole(folder, size, rest, length);
}

void InstalledLauncherPath(const char *folder, char *path, size_t size) {
  JoinPath(path, size, folder, LAUNCHER_FILE_NAME);
}

int StartInstalledLauncher(const char *folder) {
  char path[PATH_MAX_LEN];

  InstalledLauncherPath(folder, path, sizeof(path));
  return ProcessStartDetached(folder, path);
}
