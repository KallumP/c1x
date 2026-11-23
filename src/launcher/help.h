#ifndef _LAUNCHER_HELP_H_
#define _LAUNCHER_HELP_H_

/*
 * the launcher's Help tab: the pages of c1x's guide, a release's own (its docs
 * as html pages, made by the release script), or the docs on github in a
 * folder without them
 */
#include <stddef.h>
#include "paths.h"

#define HELP_ONLINE_DOCS "https://github.com/KallumP/c1x/blob/master/"
#define HELP_PAGE_COUNT 5

typedef struct {
  const char *name;         /* its button */
  const char *release_page; /* the page in a release */
  const char *repo_doc;     /* the doc it's made from, on github */
  const char *about;        /* what's in it */
} help_page;

extern const help_page help_pages[HELP_PAGE_COUNT];

/* path as a file:/// address, its backslashes as slashes and anything unsafe in an
   address escaped */
extern void FileUrl(const char *path, char *url, size_t size);
/* long enough for FileUrl of any path: each character may be escaped as 3 */
#define FILE_URL_MAX (PATH_MAX_LEN * 3 + 16)

/* where page is for repo: its own page, or the doc on github */
extern void HelpPageAddress(const char *repo, const help_page *page, char *url, size_t size);

#endif /* _LAUNCHER_HELP_H_ */
