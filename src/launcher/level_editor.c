/*
 * the level editor, run by c1x's tools (c1x_tools editor), which have node
 * built in, and the address it says it's running at
 */
#include <SDL2/SDL.h>
#include "level_editor.h"
#include "tools.h"

int LevelEditorCommand(const char *repo, char *command, size_t size) {
  return ToolsCommand(repo, "editor", command, size);
}

#define ADDRESS_START "http://localhost:"

/* the length of the terminal colour code ("\x1b[36m") at text, or 0 if there isn't one */
static size_t ColourCodeLength(const char *text) {
  size_t length = 2;

  if (text[0] != '\x1b' || text[1] != '[') { return 0; }
  while (text[length] && !SDL_isalpha(text[length])) { length++; }
  return text[length] ? length + 1 : length;
}

/* text without its colour codes, which vite may put in its output; SDL_free it */
static char *WithoutColourCodes(const char *text) {
  char *plain;
  size_t i, length;

  plain = SDL_malloc(SDL_strlen(text) + 1);
  if (!plain) { return 0; }
  for (i = 0; *text; ) {
    length = ColourCodeLength(text);
    if (length) { text += length; }
    else { plain[i++] = *text++; }
  }
  plain[i] = 0;
  return plain;
}

/* the editor's address in its output, once it says where it's running as
   vite does ("Local:   http://localhost:5173/"); returns 0 if it hasn't yet */
int FindLevelEditorAddress(const char *dev_output, char *address, size_t size) {
  char *plain, *start;
  size_t length = 0;

  plain = WithoutColourCodes(dev_output);
  if (!plain) { return 0; }
  start = SDL_strstr(plain, ADDRESS_START);
  if (start) {
    while (start[length] && !SDL_isspace(start[length])) { length++; }
    SDL_strlcpy(address, start, SDL_min(length + 1, size));
  }
  SDL_free(plain);
  return start != 0;
}
