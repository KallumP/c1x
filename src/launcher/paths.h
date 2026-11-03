#ifndef _LAUNCHER_PATHS_H_
#define _LAUNCHER_PATHS_H_

#include <stddef.h>

#define PATH_MAX_LEN 1024

extern void RepoFolderFromLauncherFolder(const char *launcher_folder, char *repo, size_t size);
extern void JoinPath(char *path, size_t size, const char *folder, const char *name);
extern int FindRepoFolder(char *repo, size_t size);

#endif /* _LAUNCHER_PATHS_H_ */
