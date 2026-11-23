#ifndef _LAUNCHER_ONLINE_LEVELS_H_
#define _LAUNCHER_ONLINE_LEVELS_H_

/*
 * the levels players have shared on mod.io, listed and downloaded by c1x's
 * tools (tools.h: c1x_tools list-online-levels and download-level)
 */
#include <stddef.h>
#include "modio_page.h"

#define ONLINE_LEVELS_MAX 100
/* how many most downloaded levels the tools list without a search. modio.ts has
   the same number, and one of its tests checks the two are the same */
#define TOP_LEVELS 10
/* an author's or name's text, with room for its terminating 0; longer is cut short */
#define ONLINE_LEVEL_TEXT_MAX 64
/* a search's text, with room for its terminating 0 */
#define ONLINE_SEARCH_MAX ONLINE_LEVEL_TEXT_MAX

typedef struct {
  int count;
  int ids[ONLINE_LEVELS_MAX]; /* each level's mod's id on mod.io */
  char authors[ONLINE_LEVELS_MAX][ONLINE_LEVEL_TEXT_MAX];
  char names[ONLINE_LEVELS_MAX][ONLINE_LEVEL_TEXT_MAX];
  char pages[ONLINE_LEVELS_MAX][MODIO_PAGE_MAX]; /* "" if it's too long to keep */
} online_levels;

/* whether c can be in a search: a letter, number, space, - or _. the search goes
   on the tools' command line as it is, so nothing a shell would read can be */
extern int IsSearchCharacter(int c);

/* search, trimmed and with one space between its words, into tidy (size long),
   as the tools read it, each word an argument of their command; only spaces is "" */
extern void TidySearch(const char *search, char *tidy, size_t size);

/* the command listing the top online levels for name "", or those with name in
   theirs (run in repo); 0 if name has a character a search can't, or is too long,
   or the tools' path can't be quoted */
extern int ListOnlineLevelsCommand(const char *repo, const char *name, char *command,
  size_t size);

/* the command downloading a level into level_src/ and building it (run in repo);
   0 if the tools' path can't be quoted */
extern int DownloadLevelCommand(const char *repo, int id, char *command, size_t size);

/* the levels in the list's output, which has a line for each:
     online level: <id>\t<author>\t<name>\t<page>
   a line not all there yet (the output is read while the list runs) is left out */
extern void FindOnlineLevels(const char *output, online_levels *levels);

#endif /* _LAUNCHER_ONLINE_LEVELS_H_ */
