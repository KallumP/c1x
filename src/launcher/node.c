/*
 * node, which the level editor and its tools run on
 */
#include <SDL2/SDL.h>
#include "node.h"

/* the major version in node --version's output ("v22.16.0"), or 0 if there isn't one */
int NodeMajorVersion(const char *version_output) {
  if (version_output[0] != 'v') { return 0; }
  return SDL_atoi(version_output + 1);
}

int IsNodeVersionSupported(int major_version) {
  return major_version >= NODE_MIN_MAJOR_VERSION;
}
