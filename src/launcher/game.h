#ifndef _LAUNCHER_GAME_H_
#define _LAUNCHER_GAME_H_

#include <stddef.h>

#ifdef _WIN32
#define GAME_FILE_NAME "c1.exe"
#else
#define GAME_FILE_NAME "c1"
#endif

extern void GamePath(const char *repo, char *path, size_t size);
extern int IsGameBuilt(const char *repo);
extern int StartGame(const char *repo);

#endif /* _LAUNCHER_GAME_H_ */
