#ifndef _LAUNCHER_UPDATE_H_
#define _LAUNCHER_UPDATE_H_

/*
 * whether there's a release newer than the launcher's version (version.h),
 * asked of github by c1x's tools (tools.h: c1x_tools check-update)
 */
#include <stddef.h>

#define RELEASE_VERSION_MAX 16
#define RELEASE_ADDRESS_MAX 128

typedef struct {
  char version[RELEASE_VERSION_MAX]; /* such as "1.4" */
  char address[RELEASE_ADDRESS_MAX]; /* its page on github */
} newer_release;

/* the command checking for a release newer than version (run in repo); 0 for
   a version that isn't a release's ("", a build's that isn't one), or a path
   that can't be quoted */
extern int UpdateCheckCommand(const char *repo, const char *version, char *command,
  size_t size);

/* the newer release in the check's output, if it says there's one; returns 0
   if it doesn't, or its page isn't one of c1x's releases on github */
extern int FindNewerRelease(const char *output, newer_release *release);

#endif /* _LAUNCHER_UPDATE_H_ */
