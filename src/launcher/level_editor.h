#ifndef _LAUNCHER_LEVEL_EDITOR_H_
#define _LAUNCHER_LEVEL_EDITOR_H_

#include <stddef.h>

/* the command starting the level editor (run in repo); 0 for a path that can't be quoted */
extern int LevelEditorCommand(const char *repo, char *command, size_t size);
extern int FindLevelEditorAddress(const char *dev_output, char *address, size_t size);

#endif /* _LAUNCHER_LEVEL_EDITOR_H_ */
