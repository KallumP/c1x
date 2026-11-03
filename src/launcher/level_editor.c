/*
 * the level editor and the tools beside it, in tools/level_editor, which
 * need their npm packages installed, and the address the editor runs at
 */
#include <SDL2/SDL.h>
#include <sys/stat.h>
#include "level_editor.h"
#include "paths.h"

void LevelEditorFolder(const char *repo, char *folder, size_t size) {
  JoinPath(folder, size, repo, "tools/level_editor");
}

static int IsFolder(const char *path) {
  struct stat info;

  return stat(path, &info) == 0 && S_ISDIR(info.st_mode);
}

int AreLevelEditorPackagesInstalled(const char *repo) {
  char folder[PATH_MAX_LEN];
  char node_modules[PATH_MAX_LEN];

  LevelEditorFolder(repo, folder, sizeof(folder));
  JoinPath(node_modules, sizeof(node_modules), folder, "node_modules");
  return IsFolder(node_modules);
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

/* the editor's address in npm run dev's output, once vite says where it's
   running ("Local:   http://localhost:5173/"); returns 0 if it hasn't yet */
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
