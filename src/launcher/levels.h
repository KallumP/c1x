#ifndef _LAUNCHER_LEVELS_H_
#define _LAUNCHER_LEVELS_H_

#include "pc/settings.h"

#define CUSTOM_LEVELS_MAX 128

/* the custom levels: those built to build/levels/, which the game can boot
   into, and the level sources in level_src/ (a folder with a map) */
typedef struct {
  int count;
  char names[CUSTOM_LEVELS_MAX][SETTINGS_BOOT_LEVEL_MAX+1];
  int built[CUSTOM_LEVELS_MAX];
} custom_levels;

/* the repo's custom levels, sorted by name */
extern void ListCustomLevels(const char *repo, custom_levels *levels);
extern int FindCustomLevel(const custom_levels *levels, const char *name);

#endif /* _LAUNCHER_LEVELS_H_ */
