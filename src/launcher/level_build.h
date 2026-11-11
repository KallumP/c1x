#ifndef _LAUNCHER_LEVEL_BUILD_H_
#define _LAUNCHER_LEVEL_BUILD_H_

/*
 * building a custom level from its source in level_src/ with build-level, the
 * level build with node built in (made by make), so players don't need node
 */
#include <stddef.h>

#ifdef _WIN32
#define BUILDER_FILE_NAME "build-level.exe"
#else
#define BUILDER_FILE_NAME "build-level"
#endif

extern void BuilderPath(const char *repo, char *path, size_t size);
extern int IsBuilderBuilt(const char *repo);

/* the command building level (run in repo); 0 for no level, or a path that
   can't be quoted */
extern int BuildLevelCommand(const char *repo, const char *level, char *command,
  size_t size);

#endif /* _LAUNCHER_LEVEL_BUILD_H_ */
