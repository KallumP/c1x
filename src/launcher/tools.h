#ifndef _LAUNCHER_TOOLS_H_
#define _LAUNCHER_TOOLS_H_

/*
 * c1x's tools (build/c1x_tools.exe, made by make): the level build, the level
 * editor and the check for a newer release, with node built in, so players
 * don't need node
 */
#include <stddef.h>

#ifdef _WIN32
#define TOOLS_FILE_NAME "c1x_tools.exe"
#else
#define TOOLS_FILE_NAME "c1x_tools"
#endif

extern void ToolsPath(const char *repo, char *path, size_t size);
extern int AreToolsBuilt(const char *repo);

/* the command running the tools with args (run in repo); 0 for a path that
   can't be quoted. args are the launcher's own, with nothing to quote */
extern int ToolsCommand(const char *repo, const char *args, char *command, size_t size);

#endif /* _LAUNCHER_TOOLS_H_ */
