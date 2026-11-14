#ifndef _LAUNCHER_HELP_H_
#define _LAUNCHER_HELP_H_

/*
 * the launcher's Help: a release's README.html (its docs as pages, made by the
 * release script), or the docs on github in a folder without one
 */
#include <stddef.h>

#define HELP_ONLINE_ADDRESS "https://github.com/KallumP/c1x#readme"

/* path as a file:/// address, its backslashes as slashes and spaces and #s escaped */
extern void FileUrl(const char *path, char *url, size_t size);

/* where Help goes for repo: its README.html, or the docs on github */
extern void HelpAddress(const char *repo, char *url, size_t size);

#endif /* _LAUNCHER_HELP_H_ */
