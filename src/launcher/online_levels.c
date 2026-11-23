/*
 * listing the levels shared on mod.io, and downloading one, with c1x's tools
 * (c1x_tools list-online-levels and download-level)
 */
#include <SDL2/SDL.h>
#include "online_levels.h"
#include "tools.h"

#define DOWNLOAD_ARGS_MAX 48
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

static int IsLineEnd(char c) {
  return c == 0 || c == '\r' || c == '\n';
}

/* how many characters text has before stop, or its line's end */
static size_t LengthBefore(const char *text, char stop) {
  size_t length = 0;

  while (!IsLineEnd(text[length]) && text[length] != stop) { length++; }
  return length;
}

/* the first length characters of text into to, cut short to fit */
static void CopyPart(char *to, const char *text, size_t length) {
  SDL_strlcpy(to, text, SDL_min(length + 1, ONLINE_LEVEL_TEXT_MAX));
}

/* the id at the start of a level's line, then the tab after it; 0 if there isn't one */
static int ReadId(const char *line, size_t *length) {
  int id = 0;
  size_t i = 0;

  while (SDL_isdigit(line[i]) && i < 9) { id = id * 10 + (line[i] - '0'); i++; }
  if (i == 0 || line[i] != '\t') { return 0; }
  *length = i + 1;
  return id;
}

/* a level's line, after its prefix, as the next of levels; whether it was one */
static int ReadLevelLine(const char *line, online_levels *levels) {
  size_t id_length, author_length, name_length;
  const char *author, *name;
  int id;

  id = ReadId(line, &id_length);
  if (!id) { return 0; }
  author = line + id_length;
  author_length = LengthBefore(author, '\t');
  if (author[author_length] != '\t') { return 0; }
  name = author + author_length + 1;
  name_length = LengthBefore(name, 0);
  if (!name[name_length]) { return 0; } /* no line end yet: more of it may be to come */
  levels->ids[levels->count] = id;
  CopyPart(levels->authors[levels->count], author, author_length);
  CopyPart(levels->names[levels->count], name, name_length);
  levels->count++;
  return 1;
}

void FindOnlineLevels(const char *output, online_levels *levels) {
  const char *line = output;

  levels->count = 0;
  while (levels->count < ONLINE_LEVELS_MAX && (line = SDL_strstr(line, ONLINE_LEVEL))) {
    line += SDL_strlen(ONLINE_LEVEL);
    ReadLevelLine(line, levels);
  }
}
