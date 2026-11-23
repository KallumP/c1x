#ifndef _LAUNCHER_RELEASE_DOWNLOAD_H_
#define _LAUNCHER_RELEASE_DOWNLOAD_H_

/*
 * downloading a newer release of c1x with c1x's tools (c1x_tools download-release),
 * which unzip it beside the player's c1x folder with their things copied in
 */
#include <stddef.h>

/* the command downloading the release version, two numbers like 1.5 (run in
   repo); 0 if version isn't one, or the tools' path can't be quoted */
extern int DownloadReleaseCommand(const char *repo, const char *version, char *command,
  size_t size);

/* the new version's folder, from the download's output, which has this line in
   it once it's installed:
     installed release: C:\Games\c1x-1.5
   returns 0, leaving folder as it was, if the line isn't there, isn't all there
   yet (the output is read while it runs), or is too long for folder */
extern int FindInstalledRelease(const char *output, char *folder, size_t size);

/* the new version's launcher, at the top of its folder as in every release */
extern void InstalledLauncherPath(const char *folder, char *path, size_t size);

/* starts the new version's launcher in its folder; returns 0 if it can't */
extern int StartInstalledLauncher(const char *folder);

#endif /* _LAUNCHER_RELEASE_DOWNLOAD_H_ */
