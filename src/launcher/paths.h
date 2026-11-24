#ifndef _LAUNCHER_PATHS_H_
#define _LAUNCHER_PATHS_H_

#include <stddef.h>
#include <time.h>

#define PATH_MAX_LEN 1024

#ifdef _WIN32
#define LAUNCHER_FILE_NAME "c1x_launcher.exe"
#else
#define LAUNCHER_FILE_NAME "c1x_launcher"
#endif

extern void RepoFolderFromLauncherFolder(const char *launcher_folder, char *repo, size_t size);
extern void JoinPath(char *path, size_t size, const char *folder, const char *name);
extern int FindRepoFolder(char *repo, size_t size);

/* when the launcher in repo was built: its file's modified time, or 0 if it can't tell */
extern time_t LauncherBuiltTime(const char *repo);

#endif /* _LAUNCHER_PATHS_H_ */
