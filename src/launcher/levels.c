/*
 * the levels built to build/levels/ (a .nsd and .nsf each), for the
 * launcher's boot_level dropdown
 */
#include <SDL2/SDL.h>
#include <dirent.h>
#include "levels.h"

/* whether name is one boot_level takes, by the game's own rules */
static int IsBootableName(const char *name) {
  char line[64];
  pc_settings s;

  SDL_snprintf(line, sizeof(line), "boot_level = %s", name);
  return SettingsParseLine(line, &s) == 1;
}

/* the level name of a .nsd file's name into name; returns 0 if it isn't one */
static int LevelNameOfFile(const char *file_name, char *name, size_t size) {
  size_t len;

  len = SDL_strlen(file_name);
  if (len <= 4 || SDL_strcasecmp(file_name + len - 4, ".nsd") != 0) { return 0; }
  if (len - 4 >= size) { return 0; }
  SDL_memcpy(name, file_name, len - 4);
  name[len - 4] = 0;
  return IsBootableName(name);
}

static int CompareNames(const void *a, const void *b) {
  return SDL_strcmp(a, b);
}

/* list the levels built to folder, sorted by name (none if there's no folder) */
void ListBuiltLevels(const char *folder, built_levels *levels) {
  DIR *dir;
  struct dirent *entry;

  levels->count = 0;
  dir = opendir(folder);
  if (!dir) { return; }
  while ((entry = readdir(dir)) && levels->count < BUILT_LEVELS_MAX) {
    if (LevelNameOfFile(entry->d_name, levels->names[levels->count],
      sizeof(levels->names[0]))) {
      levels->count++;
    }
  }
  closedir(dir);
  SDL_qsort(levels->names, levels->count, sizeof(levels->names[0]), CompareNames);
}

/* the index of the level called name, or -1 if it isn't built */
int FindBuiltLevel(const built_levels *levels, const char *name) {
  int i;

  for (i=0;i<levels->count;i++) {
    if (SDL_strcmp(levels->names[i], name) == 0) { return i; }
  }
  return -1;
}
