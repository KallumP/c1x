#ifndef _LAUNCHER_LEVEL_EDITOR_H_
#define _LAUNCHER_LEVEL_EDITOR_H_

#include <stddef.h>

extern void LevelEditorFolder(const char *repo, char *folder, size_t size);
extern int AreLevelEditorPackagesInstalled(const char *repo);

#endif /* _LAUNCHER_LEVEL_EDITOR_H_ */
