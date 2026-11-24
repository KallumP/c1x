/*
 * the custom levels: those built to build/levels/ (a .nsd and .nsf each),
 * and the level sources in level_src/ (a folder holding a map, a .obj) that
 * can be built, for the launcher's levels tab and boot_level dropdown
 */
#include <SDL2/SDL.h>
#include <dirent.h>
#include <string.h>
#include <sys/stat.h>
#include "levels.h"
#include "help.h"
#include "paths.h"
#include "text_file.h"
#include "tool_output.h"

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

/* the levels that come with c1x, in the order they're listed: a folder a line */
#define INCLUDED_LEVELS_FILE "level_src/included_levels.txt"
/* the rank of a level that doesn't come with c1x: after all that do */
#define NOT_INCLUDED CUSTOM_LEVELS_MAX

typedef struct {
  char name[SETTINGS_BOOT_LEVEL_MAX+1];
  char title[LEVEL_TITLE_MAX];
  int built;
  int downloaded;
  level_kind kind;
  int rank; /* its place among the levels that come with c1x, or NOT_INCLUDED */
} custom_level;

static const char *const LEVEL_KIND_TITLES[] = {
  "Comes with c1x",
  "Downloaded",
  "Your own",
};

const char *LevelKindTitle(level_kind kind) {
  return LEVEL_KIND_TITLES[kind];
}

int StartsLevelKind(const custom_levels *levels, int index) {
  return index == 0 || levels->kinds[index - 1] != levels->kinds[index];
}

/* in the order levels.h gives; levels with the same title go by folder name */
static int CompareLevels(const void *a, const void *b) {
  const custom_level *first, *second;
  int by_title;

  first = a;
  second = b;
  if (first->kind != second->kind) { return (int)first->kind - (int)second->kind; }
  if (first->rank != second->rank) { return first->rank - second->rank; }
  by_title = SDL_strcasecmp(first->title, second->title);
  if (by_title) { return by_title; }
  return SDL_strcmp(first->name, second->name);
}

/* name's place among the levels included_levels.txt's text, included, lists; or
   NOT_INCLUDED if it doesn't list it. lines starting with # say what it is */
static int IncludedRank(const char *included, const char *name) {
  const char *line, *next, *end;
  size_t length;
  int rank;

  rank = 0;
  for (line = included; *line; line = next) {
    end = EndOfLine(line, &next);
    length = (size_t)(end - line);
    if (length == 0 || line[0] == '#') { continue; }
    if (length == SDL_strlen(name) && SDL_strncmp(line, name, length) == 0) {
      return rank;
    }
    rank++;
  }
  return NOT_INCLUDED;
}

static level_kind KindOfLevel(int rank, int downloaded) {
  if (rank != NOT_INCLUDED) { return LEVEL_COMES_WITH_C1X; }
  if (downloaded) { return LEVEL_DOWNLOADED; }
  return LEVEL_OWN;
}

/* where each level is from, and its place among those that come with c1x, by
   level_src/included_levels.txt and the downloaded levels already found */
static void FindKinds(const char *repo, custom_levels *levels) {
  char path[PATH_MAX_LEN];
  char *included;
  int i, rank;

  JoinPath(path, sizeof(path), repo, INCLUDED_LEVELS_FILE);
  included = ReadWholeFileOrEmpty(path);
  for (i = 0; i < levels->count; i++) {
    rank = IncludedRank(included, levels->names[i]);
    levels->included_ranks[i] = rank;
    levels->kinds[i] = KindOfLevel(rank, levels->downloaded[i]);
  }
  SDL_free(included);
}

static void LevelToSort(const custom_levels *levels, int index, custom_level *level) {
  SDL_strlcpy(level->name, levels->names[index], sizeof(level->name));
  SDL_strlcpy(level->title, levels->titles[index], sizeof(level->title));
  level->built = levels->built[index];
  level->downloaded = levels->downloaded[index];
  level->rank = levels->included_ranks[index];
  level->kind = levels->kinds[index];
}

static void PutSortedLevel(custom_levels *levels, int index, const custom_level *level) {
  SDL_strlcpy(levels->names[index], level->name, sizeof(levels->names[0]));
  SDL_strlcpy(levels->titles[index], level->title, sizeof(levels->titles[0]));
  levels->built[index] = level->built;
  levels->downloaded[index] = level->downloaded;
  levels->included_ranks[index] = level->rank;
  levels->kinds[index] = level->kind;
}

static void SortLevels(custom_levels *levels) {
  static custom_level sorted[CUSTOM_LEVELS_MAX];
  int i;

  for (i = 0; i < levels->count; i++) { LevelToSort(levels, i, &sorted[i]); }
  SDL_qsort(sorted, levels->count, sizeof(sorted[0]), CompareLevels);
  for (i = 0; i < levels->count; i++) { PutSortedLevel(levels, i, &sorted[i]); }
}

/* when the file at path was last saved; 0 if it isn't a file */
static time_t SavedTime(const char *path) {
  struct stat info;

  if (stat(path, &info) != 0 || !S_ISREG(info.st_mode)) { return 0; }
  return info.st_mtime;
}

/* whether the builder reads file_name: blender's own files it doesn't, only the map exported from them */
static int IsBuildInput(const char *file_name) {
  return !HasExtension(file_name, ".blend") && !HasExtension(file_name, ".blend1");
}

/* when a file in folder that the builder reads was last saved; 0 if none */
static time_t NewestInputTime(const char *folder) {
  DIR *dir = opendir(folder);
  struct dirent *entry;
  char path[PATH_MAX_LEN];
  time_t newest = 0, saved;

  if (!dir) { return 0; }
  while ((entry = readdir(dir))) {
    if (!IsBuildInput(entry->d_name)) { continue; }
    JoinPath(path, sizeof(path), folder, entry->d_name);
    saved = SavedTime(path);
    if (saved > newest) { newest = saved; }
  }
  closedir(dir);
  return newest;
}

/* whether a source of the built level called name was saved after it was built */
static int IsOutOfDate(const char *repo, const char *name) {
  char path[PATH_MAX_LEN], file[SETTINGS_BOOT_LEVEL_MAX+16];
  time_t built;

  SDL_snprintf(file, sizeof(file), "build/levels/%s.nsd", name);
  JoinPath(path, sizeof(path), repo, file);
  built = SavedTime(path);
  SDL_snprintf(file, sizeof(file), "level_src/%s", name);
  JoinPath(path, sizeof(path), repo, file);
  return NewestInputTime(path) > built;
}

static void MarkOutOfDateLevels(const char *repo, custom_levels *levels) {
  int i;

  for (i = 0; i < levels->count; i++) {
    levels->out_of_date[i] = levels->built[i] && IsOutOfDate(repo, levels->names[i]);
  }
}

#define MODIO_NOTE_MOD_KEY "\"modId\":"

/* whether the level source called name was downloaded from mod.io: its
   .modio.json notes the mod it's from */
static int WasDownloaded(const char *repo, const char *name) {
  char path[PATH_MAX_LEN], file[SETTINGS_BOOT_LEVEL_MAX+32];
  char *note;
  int downloaded;

  SDL_snprintf(file, sizeof(file), "level_src/%s/.modio.json", name);
  JoinPath(path, sizeof(path), repo, file);
  note = ReadWholeFileOrEmpty(path);
  downloaded = SDL_strstr(note, MODIO_NOTE_MOD_KEY) != 0;
  SDL_free(note);
  return downloaded;
}

static void FindDownloadedLevels(const char *repo, custom_levels *levels) {
  int i;

  for (i = 0; i < levels->count; i++) {
    levels->downloaded[i] = WasDownloaded(repo, levels->names[i]);
  }
}

/* the title of the level called name, by its source's level.cfg if it has one */
static void ReadLevelTitle(const char *repo, const char *name, char *title, size_t size) {
  char path[PATH_MAX_LEN], file[SETTINGS_BOOT_LEVEL_MAX+32];
  char *cfg;

  SDL_snprintf(file, sizeof(file), "level_src/%s/level.cfg", name);
  JoinPath(path, sizeof(path), repo, file);
  cfg = ReadWholeFileOrEmpty(path);
  LevelTitle(name, cfg, title, size);
  SDL_free(cfg);
}

static void FindTitles(const char *repo, custom_levels *levels) {
  int i;

  for (i = 0; i < levels->count; i++) {
    ReadLevelTitle(repo, levels->names[i], levels->titles[i], sizeof(levels->titles[i]));
  }
}

void ListCustomLevels(const char *repo, custom_levels *levels) {
  char folder[PATH_MAX_LEN];

  levels->count = 0;
  JoinPath(folder, sizeof(folder), repo, "build/levels");
  AddBuiltLevels(folder, levels);
  JoinPath(folder, sizeof(folder), repo, "level_src");
  AddLevelSources(folder, levels);
  FindTitles(repo, levels);
  FindDownloadedLevels(repo, levels);
  FindKinds(repo, levels);
  SortLevels(levels);
  MarkOutOfDateLevels(repo, levels);
}

/* the index of the level called name, or -1 if there's none */
int FindCustomLevel(const custom_levels *levels, const char *name) {
  int i;

  for (i=0;i<levels->count;i++) {
    if (SDL_strcmp(levels->names[i], name) == 0) { return i; }
  }
  return -1;
}

const char *CustomLevelStatus(const custom_levels *levels, int index) {
  if (!levels->built[index]) { return "not built"; }
  if (levels->out_of_date[index]) { return "out of date"; }
  return "built";
}

void CustomLevelLabel(const custom_levels *levels, int index, char *label, size_t size) {
  if (levels->built[index]) {
    SDL_strlcpy(label, levels->titles[index], size);
  } else {
    SDL_snprintf(label, size, "%s (not built)", levels->titles[index]);
  }
}

void LevelSourcesFolderUrl(const char *repo, char *url, size_t size) {
  char path[PATH_MAX_LEN];

  JoinPath(path, sizeof(path), repo, "level_src");
  FileUrl(path, url, size);
}
