/*
 * extracting the game's files into streams/ from a disc image, with the
 * level editor's npm run extract-streams (run in its folder)
 */
#include <SDL2/SDL.h>
#include "extract.h"
#include "level_editor.h"

#ifdef _WIN32
#define QUOTE '"'  /* cmd.exe */
#else
#define QUOTE '\'' /* sh, which expands nothing in single quotes */
#endif

/* the command extracting image's files, installing the script's packages
   first if need be; returns 0 for no image, or one that can't be quoted */
int ExtractStreamsCommand(const char *repo, const char *image, char *command,
  size_t size) {
  const char *install;

  if (!image[0] || SDL_strchr(image, QUOTE)) { return 0; }
  install = AreLevelEditorPackagesInstalled(repo) ? "" : "npm install && ";
  SDL_snprintf(command, size, "%snpm run extract-streams -- %c%s%c",
    install, QUOTE, image, QUOTE);
  return 1;
}
