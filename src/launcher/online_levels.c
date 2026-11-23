/*
 * listing the levels shared on mod.io, and downloading one, with c1x's tools
 * (c1x_tools list-online-levels and download-level)
 */
#include <SDL2/SDL.h>
#include "online_levels.h"
#include "tool_output.h"
#include "tools.h"

#define DOWNLOAD_ARGS_MAX 48
#define LIST_COMMAND "list-online-levels"
#define ID_DIGITS_MAX 9 /* the most an id has: any more could be too big for an int */
/* what the tools say before each level's line. onlineLevels.ts has the same
   text, and one of its tests checks the two are the same */
#define ONLINE_LEVEL "online level: "

int IsSearchCharacter(int c) {
  if (c < 0 || c > 127) { return 0; } /* isalnum is only defined for a byte */
  return SDL_isalnum(c) || c == ' ' || c == '-' || c == '_';
}

void TidySearch(const char *search, char *tidy, size_t size) {
  size_t length;
  const char *c;

  length = 0;
  for (c = search; *c && length + 1 < size; c++) {
    if (*c == ' ' && (length == 0 || tidy[length - 1] == ' ')) { continue; }
    tidy[length++] = *c;
  }
  if (length > 0 && tidy[length - 1] == ' ') { length--; }
  tidy[length] = 0;
}

static int CanSearchFor(const char *name) {
  size_t i;

  for (i = 0; name[i]; i++) {
    if (!IsSearchCharacter((unsigned char)name[i])) { return 0; }
  }
  return i < ONLINE_SEARCH_MAX;
}

int ListOnlineLevelsCommand(const char *repo, const char *name, char *command,
  size_t size) {
  char args[sizeof(LIST_COMMAND) + ONLINE_SEARCH_MAX];

  if (!CanSearchFor(name)) { return 0; }
  if (!name[0]) { return ToolsCommand(repo, LIST_COMMAND, command, size); }
  SDL_snprintf(args, sizeof(args), LIST_COMMAND " %s", name);
  return ToolsCommand(repo, args, command, size);
}

int DownloadLevelCommand(const char *repo, int id, char *command, size_t size) {
  char args[DOWNLOAD_ARGS_MAX];

  SDL_snprintf(args, sizeof(args), "download-level %d", id);
  return ToolsCommand(repo, args, command, size);
}

/* the id at the start of a level's line, then the tab after it; 0 if there isn't one */
static int ReadId(const char *line, size_t *length) {
  size_t digits;

  digits = DigitCount(line);
  if (digits == 0 || digits > ID_DIGITS_MAX || line[digits] != '\t') { return 0; }
  *length = digits + 1;
  return SDL_atoi(line);
}

/* the field after field (length long), past the tab between them; 0 if there's no tab */
static const char *FieldAfter(const char *field, size_t length) {
  if (field[length] != '\t') { return 0; }
  return field + length + 1;
}

/* a level's line, after its prefix, as the next of levels; a line that isn't
   one is skipped */
static void ReadLevelLine(const char *line, online_levels *levels) {
  size_t id_length, author_length, name_length, page_length;
  const char *author, *name, *page;
  int id, at;

  id = ReadId(line, &id_length);
  if (!id) { return; }
  author = line + id_length;
  author_length = FieldLength(author);
  name = FieldAfter(author, author_length);
  if (!name) { return; }
  name_length = FieldLength(name);
  page = FieldAfter(name, name_length);
  if (!page) { return; }
  page_length = LineLength(page);
  if (!page[page_length]) { return; } /* no line end yet: more of it may be to come */
  at = levels->count;
  levels->ids[at] = id;
  CopyCutShort(levels->authors[at], ONLINE_LEVEL_TEXT_MAX, author, author_length);
  CopyCutShort(levels->names[at], ONLINE_LEVEL_TEXT_MAX, name, name_length);
  CopyWhole(levels->pages[at], MODIO_PAGE_MAX, page, page_length);
  levels->count++;
}

void FindOnlineLevels(const char *output, online_levels *levels) {
  const char *line;

  line = output;
  levels->count = 0;
  while (levels->count < ONLINE_LEVELS_MAX && (line = SDL_strstr(line, ONLINE_LEVEL))) {
    line += SDL_strlen(ONLINE_LEVEL);
    ReadLevelLine(line, levels);
  }
}
