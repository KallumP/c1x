/*
 * the launcher's version: the release it was built for (see doc/releasing.md).
 * make builds this file again when C1X_VERSION isn't what it was built with
 */
#include <SDL2/SDL.h>
#include "version.h"

#ifndef C1X_VERSION
#define C1X_VERSION ""
#endif

const char *LauncherVersion(void) {
  return C1X_VERSION;
}

int IsVersionAsked(int argc, char *argv[]) {
  return argc == 2 && SDL_strcmp(argv[1], "--version") == 0;
}
