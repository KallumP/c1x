#ifndef _LAUNCHER_LEVEL_BUILD_H_
#define _LAUNCHER_LEVEL_BUILD_H_

/*
 * building a custom level from its source in level_src/ with c1x's tools
 * (tools.h: c1x_tools build-level), so players don't need node
 */
#include <stddef.h>

/* the command building level (run in repo); 0 for no level, or a path that
   can't be quoted */
extern int BuildLevelCommand(const char *repo, const char *level, char *command,
  size_t size);

#endif /* _LAUNCHER_LEVEL_BUILD_H_ */
