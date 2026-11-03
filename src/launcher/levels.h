#ifndef _LAUNCHER_LEVELS_H_
#define _LAUNCHER_LEVELS_H_

#include "pc/settings.h"

#define BUILT_LEVELS_MAX 128

/* the levels built to build/levels/, which the game can boot into */
typedef struct {
  int count;
  char names[BUILT_LEVELS_MAX][SETTINGS_BOOT_LEVEL_MAX+1];
} built_levels;

extern void ListBuiltLevels(const char *folder, built_levels *levels);
extern int FindBuiltLevel(const built_levels *levels, const char *name);

#endif /* _LAUNCHER_LEVELS_H_ */
