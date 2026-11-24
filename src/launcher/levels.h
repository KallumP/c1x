#ifndef _LAUNCHER_LEVELS_H_
#define _LAUNCHER_LEVELS_H_

#include "pc/settings.h"
#include "level_title.h"

#define CUSTOM_LEVELS_MAX 128

/* where a custom level is from, which the launcher lists them under, in this order */
typedef enum {
  LEVEL_COMES_WITH_C1X, /* level_src/included_levels.txt lists it */
  LEVEL_DOWNLOADED,     /* from mod.io: its source's .modio.json notes its mod */
  LEVEL_OWN,            /* anything else: made, or added by hand, by the player */
} level_kind;

/* the custom levels: those built to build/levels/, which the game can boot
   into, and the level sources in level_src/ (a folder with a map) */
typedef struct {
  int count;
  /* its name: its folder's, and what boot_level says */
  char names[CUSTOM_LEVELS_MAX][SETTINGS_BOOT_LEVEL_MAX+1];
  char titles[CUSTOM_LEVELS_MAX][LEVEL_TITLE_MAX]; /* what the launcher shows it as */
  int built[CUSTOM_LEVELS_MAX];
  int out_of_date[CUSTOM_LEVELS_MAX]; /* built, but a source was saved since */
  int downloaded[CUSTOM_LEVELS_MAX]; /* its source's .modio.json notes a mod.io mod */
  level_kind kinds[CUSTOM_LEVELS_MAX];
  /* its place among the levels that come with c1x, which they're listed in */
  int included_ranks[CUSTOM_LEVELS_MAX];
} custom_levels;

/* the repo's custom levels by kind: those that come with c1x, in the order
   level_src/included_levels.txt lists them, then those downloaded from mod.io and
   then the player's own, each by title */
extern void ListCustomLevels(const char *repo, custom_levels *levels);
extern int FindCustomLevel(const custom_levels *levels, const char *name);

/* the title of the section the launcher lists levels of kind under */
extern const char *LevelKindTitle(level_kind kind);

/* whether the level at index is the first of its kind, so starts its section */
extern int StartsLevelKind(const custom_levels *levels, int index);

/* "built", "not built" or "out of date", for the levels tab */
extern const char *CustomLevelStatus(const custom_levels *levels, int index);

/* level_src/ as a file:// url, for opening it in the file browser */
extern void LevelSourcesFolderUrl(const char *repo, char *url, size_t size);

/* the level's title, saying if it isn't built, as the launcher lists it */
extern void CustomLevelLabel(const custom_levels *levels, int index, char *label, size_t size);

#endif /* _LAUNCHER_LEVELS_H_ */
