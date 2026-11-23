#ifndef _LAUNCHER_LEVELS_H_
#define _LAUNCHER_LEVELS_H_

#include "pc/settings.h"
#include "modio_page.h"

#define CUSTOM_LEVELS_MAX 128

/* the custom levels: those built to build/levels/, which the game can boot
   into, and the level sources in level_src/ (a folder with a map) */
typedef struct {
  int count;
  char names[CUSTOM_LEVELS_MAX][SETTINGS_BOOT_LEVEL_MAX+1];
  int built[CUSTOM_LEVELS_MAX];
  int out_of_date[CUSTOM_LEVELS_MAX]; /* built, but a source was saved since */
  /* its page on mod.io if it was downloaded from there (its source's .modio.json
     says), else "" */
  char modio_pages[CUSTOM_LEVELS_MAX][MODIO_PAGE_MAX];
} custom_levels;

/* the repo's custom levels, sorted by name */
extern void ListCustomLevels(const char *repo, custom_levels *levels);
extern int FindCustomLevel(const custom_levels *levels, const char *name);

/* "built", "not built" or "out of date", for the levels tab */
extern const char *CustomLevelStatus(const custom_levels *levels, int index);

/* level_src/ as a file:// url, for opening it in the file browser */
extern void LevelSourcesFolderUrl(const char *repo, char *url, size_t size);

/* the level's name, saying if it isn't built, as the launcher lists it */
extern void CustomLevelLabel(const custom_levels *levels, int index, char *label, size_t size);

#endif /* _LAUNCHER_LEVELS_H_ */
