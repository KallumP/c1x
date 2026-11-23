/*
 * listing the levels shared on mod.io, and downloading one, with c1x's tools
 * (c1x_tools list-online-levels and download-level)
 */
#include <SDL2/SDL.h>
#include "online_levels.h"
#include "tool_output.h"
#include "tools.h"

#define DOWNLOAD_ARGS_MAX 48
#define ID_DIGITS_MAX 9 /* the most an id has: any more could be too big for an int */
/* what the tools say before each level's line. onlineLevels.ts has the same
   text, and one of its tests checks the two are the same */
#define ONLINE_LEVEL "online level: "

int ListOnlineLevelsCommand(const char *repo, char *command, size_t size) {
  return ToolsCommand(repo, "list-online-levels", command, size);
}

int DownloadLevelCommand(const char *repo, int id, char *command, size_t size) {
  char args[DOWNLOAD_ARGS_MAX];

  SDL_snprintf(args, sizeof(args), "download-level %d", id);
  return ToolsCommand(repo, args, command, size);
}

/* the first length characters of text into to, cut short to fit */
static void CopyPart(char *to, const char *text, size_t length) {
  SDL_strlcpy(to, text, SDL_min(length + 1, ONLINE_LEVEL_TEXT_MAX));
}

/* the id at the start of a level's line, then the tab after it; 0 if there isn't one */
static int ReadId(const char *line, size_t *length) {
  size_t digits = DigitCount(line);

  if (digits == 0 || digits > ID_DIGITS_MAX || line[digits] != '\t') { return 0; }
  *length = digits + 1;
  return SDL_atoi(line);
}

/* a level's line, after its prefix, as the next of levels; a line that isn't
   one is skipped */
static void ReadLevelLine(const char *line, online_levels *levels) {
  size_t id_length, author_length, name_length;
  const char *author, *name;
  int id;

  id = ReadId(line, &id_length);
  if (!id) { return; }
  author = line + id_length;
  author_length = FieldLength(author);
  if (author[author_length] != '\t') { return; }
  name = author + author_length + 1;
  name_length = LineLength(name);
  if (!name[name_length]) { return; } /* no line end yet: more of it may be to come */
  levels->ids[levels->count] = id;
  CopyPart(levels->authors[levels->count], author, author_length);
  CopyPart(levels->names[levels->count], name, name_length);
  levels->count++;
}

void FindOnlineLevels(const char *output, online_levels *levels) {
  const char *line = output;

  levels->count = 0;
  while (levels->count < ONLINE_LEVELS_MAX && (line = SDL_strstr(line, ONLINE_LEVEL))) {
    line += SDL_strlen(ONLINE_LEVEL);
    ReadLevelLine(line, levels);
  }
}
