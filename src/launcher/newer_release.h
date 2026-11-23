#ifndef _LAUNCHER_NEWER_RELEASE_H_
#define _LAUNCHER_NEWER_RELEASE_H_

/*
 * whether there's a release newer than the launcher's version (version.h),
 * asked of github by c1x's tools (tools.h: c1x_tools check-update)
 */
#include <stddef.h>

#define RELEASE_VERSION_MAX 16 /* a version's text with its end, such as "1.4" */
#define VERSION_LABEL_MAX 32

/* github's page for c1x's newest release, whichever that is */
#define LATEST_RELEASE_PAGE "https://github.com/KallumP/c1x/releases/latest"

/* whether version is a release's: two numbers with a dot between, like "1.3" */
extern int IsReleaseVersion(const char *version);

/* the tools' command (run in repo) to do subcommand with the release version,
   as "c1x_tools <subcommand> <version>". returns 0 if version isn't a release's,
   or if the tools' path can't be quoted */
extern int ReleaseToolsCommand(const char *repo, const char *subcommand,
  const char *version, char *command, size_t size);

/* the command checking for a release newer than version (run in repo).
   returns 0 if version isn't a release's (a dev build's is ""), or if the
   tools' path can't be quoted */
extern int NewerReleaseCommand(const char *repo, const char *version, char *command,
  size_t size);

/* the newer release's version, from the check's output, which has this line
   in it when there's one:
     newer release: 1.5
   returns 0, leaving version as it was, if the line isn't there, isn't all
   there yet (the output is read while the check runs), or isn't a version */
extern int FindNewerRelease(const char *output, char *version, size_t size);

/* what the launcher shows as its version: "v1.3", or "dev build" for "" */
extern void VersionLabel(const char *version, char *label, size_t size);

#endif /* _LAUNCHER_NEWER_RELEASE_H_ */
