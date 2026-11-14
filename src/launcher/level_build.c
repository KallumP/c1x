/*
 * building a custom level with c1x's tools (c1x_tools build-level <level>),
 * which have node built in, so the launcher builds levels without node
 */
#include <SDL2/SDL.h>
#include "level_build.h"
#include "paths.h"
#include "tools.h"

/* levels are named as boot_level takes them, with nothing to quote */
int BuildLevelCommand(const char *repo, const char *level, char *command,
  size_t size) {
  char args[PATH_MAX_LEN];

  if (!level[0]) { return 0; }
  SDL_snprintf(args, sizeof(args), "build-level %s", level);
  return ToolsCommand(repo, args, command, size);
}
