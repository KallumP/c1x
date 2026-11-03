/*
 * the game, as the launcher sees it: built to build/ in the repo folder
 */
#include <SDL2/SDL.h>
#include "game.h"
#include "paths.h"
#include "process.h"

/* the game's path in repo */
void GamePath(const char *repo, char *path, size_t size) {
  JoinPath(path, size, repo, "build/" GAME_FILE_NAME);
}

int IsGameBuilt(const char *repo) {
  char path[PATH_MAX_LEN];
  SDL_RWops *file;

  GamePath(repo, path, sizeof(path));
  file = SDL_RWFromFile(path, "rb");
  if (!file) { return 0; }
  SDL_RWclose(file);
  return 1;
}

/* start the game from repo (where it finds streams/ and settings.cfg); returns 0 if it can't */
int StartGame(const char *repo) {
  char path[PATH_MAX_LEN];

  GamePath(repo, path, sizeof(path));
  return ProcessStartDetached(repo, path);
}
