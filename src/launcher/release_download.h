#ifndef _LAUNCHER_RELEASE_DOWNLOAD_H_
#define _LAUNCHER_RELEASE_DOWNLOAD_H_

/*
 * downloading a newer release of c1x into the player's Downloads folder with
 * c1x's tools (c1x_tools download-release), for them to unzip
 */
#include <stddef.h>

/* the command downloading the release version, two numbers like 1.5 (run in
   repo); 0 if version isn't one, or the tools' path can't be quoted */
extern int DownloadReleaseCommand(const char *repo, const char *version, char *command,
  size_t size);

/* where the download saved the zip, from its output, which has this line in it
   once it's saved:
     saved release: C:\Users\me\Downloads\c1x-1.5.zip
   returns 0, leaving path as it was, if the line isn't there, isn't all there
   yet (the output is read while it runs), or is too long for path */
extern int FindSavedRelease(const char *output, char *path, size_t size);

#endif /* _LAUNCHER_RELEASE_DOWNLOAD_H_ */
