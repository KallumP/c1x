/*
 * the game, as the launcher sees it: built to build/ in the repo folder
 */
#include <SDL2/SDL.h>
#include "game.h"
#include "paths.h"

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
