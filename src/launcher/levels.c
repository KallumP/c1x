/*
 * the custom levels: those built to build/levels/ (a .nsd and .nsf each),
 * and the level sources in level_src/ (a folder holding a map, a .obj) that
 * can be built, for the launcher's levels tab and boot_level dropdown
 */
#include <SDL2/SDL.h>
#include <dirent.h>
#include "levels.h"
#include "paths.h"

/* whether name is one boot_level takes, by the game's own rules */
static int IsBootableName(const char *name) {
  char line[64];
  pc_settings s;

  SDL_snprintf(line, sizeof(line), "boot_level = %s", name);
  return SettingsParseLine(line, &s) == 1;
}

static int HasExtension(const char *file_name, const char *extension) {
  size_t len = SDL_strlen(file_name);
  size_t extension_len = SDL_strlen(extension);

  if (len <= extension_len) { return 0; }
  return SDL_strcasecmp(file_name + len - extension_len, extension) == 0;
}

/* the level name of a .nsd file's name into name; returns 0 if it isn't one */
static int LevelNameOfFile(const char *file_name, char *name, size_t size) {
  size_t len = SDL_strlen(file_name);

  if (!HasExtension(file_name, ".nsd") || len - 4 >= size) { return 0; }
  SDL_memcpy(name, file_name, len - 4);
  name[len - 4] = 0;
  return IsBootableName(name);
}

/* whether folder holds a map (a .obj); 0 if it isn't a folder */
static int HoldsMap(const char *folder) {
  DIR *dir = opendir(folder);
  struct dirent *entry;
  int found = 0;

  if (!dir) { return 0; }
  while (!found && (entry = readdir(dir))) { found = HasExtension(entry->d_name, ".obj"); }
  closedir(dir);
  return found;
}

/* adds name, or marks it built if it's already there */
static void AddLevel(custom_levels *levels, const char *name, int built) {
  int at = FindCustomLevel(levels, name);

  if (at < 0) {
    if (levels->count >= CUSTOM_LEVELS_MAX) { return; }
    at = levels->count++;
    SDL_strlcpy(levels->names[at], name, sizeof(levels->names[0]));
    levels->built[at] = 0;
  }
  if (built) { levels->built[at] = 1; }
}

static void AddBuiltLevels(const char *folder, custom_levels *levels) {
  DIR *dir = opendir(folder);
  struct dirent *entry;
  char name[SETTINGS_BOOT_LEVEL_MAX+1];

  if (!dir) { return; }
  while ((entry = readdir(dir))) {
    if (LevelNameOfFile(entry->d_name, name, sizeof(name))) { AddLevel(levels, name, 1); }
  }
  closedir(dir);
}

static int IsLevelSource(const char *sources, const char *name) {
  char folder[PATH_MAX_LEN];

  if (name[0] == '.' || SDL_strlen(name) > SETTINGS_BOOT_LEVEL_MAX) { return 0; }
  if (!IsBootableName(name)) { return 0; }
  JoinPath(folder, sizeof(folder), sources, name);
  return HoldsMap(folder);
}

static void AddLevelSources(const char *sources, custom_levels *levels) {
  DIR *dir = opendir(sources);
  struct dirent *entry;

  if (!dir) { return; }
  while ((entry = readdir(dir))) {
    if (IsLevelSource(sources, entry->d_name)) { AddLevel(levels, entry->d_name, 0); }
  }
  closedir(dir);
}

typedef struct {
  char name[SETTINGS_BOOT_LEVEL_MAX+1];
  int built;
} custom_level;

static int CompareLevels(const void *a, const void *b) {
  return SDL_strcmp(((const custom_level*)a)->name, ((const custom_level*)b)->name);
}

static void SortLevels(custom_levels *levels) {
  static custom_level sorted[CUSTOM_LEVELS_MAX];
  int i;

  for (i = 0; i < levels->count; i++) {
    SDL_strlcpy(sorted[i].name, levels->names[i], sizeof(sorted[i].name));
    sorted[i].built = levels->built[i];
  }
  SDL_qsort(sorted, levels->count, sizeof(sorted[0]), CompareLevels);
  for (i = 0; i < levels->count; i++) {
    SDL_strlcpy(levels->names[i], sorted[i].name, sizeof(levels->names[0]));
    levels->built[i] = sorted[i].built;
  }
}

void ListCustomLevels(const char *repo, custom_levels *levels) {
  char folder[PATH_MAX_LEN];

  levels->count = 0;
  JoinPath(folder, sizeof(folder), repo, "build/levels");
  AddBuiltLevels(folder, levels);
  JoinPath(folder, sizeof(folder), repo, "level_src");
  AddLevelSources(folder, levels);
  SortLevels(levels);
}

/* the index of the level called name, or -1 if there's none */
int FindCustomLevel(const custom_levels *levels, const char *name) {
  int i;

  for (i=0;i<levels->count;i++) {
    if (SDL_strcmp(levels->names[i], name) == 0) { return i; }
  }
  return -1;
}

void CustomLevelLabel(const custom_levels *levels, int index, char *label, size_t size) {
  if (levels->built[index]) {
    SDL_strlcpy(label, levels->names[index], size);
  } else {
    SDL_snprintf(label, size, "%s (not built)", levels->names[index]);
  }
}
