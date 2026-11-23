/*
 * a custom level's title, as the level editor gives it (levelTitle.ts): drawn
 * on its loading screen in the game's own letters, so only letters, spaces and
 * full stops, up to 20 of them
 */
#include <SDL2/SDL.h>
#include "level_title.h"
#include "text_file.h"

#define TITLE_LENGTH_MAX 20 /* as long as the game's longest name, Fumbling in the Dark */

static int IsTitleCharacter(char c) {
  return SDL_isalpha((unsigned char)c) || c == ' ' || c == '.';
}

/* whether the loading screen can draw all of text, and it's not empty or too long */
static int IsDrawableTitle(const char *text) {
  size_t length, i;

  length = SDL_strlen(text);
  if (length == 0 || length > TITLE_LENGTH_MAX) { return 0; }
  for (i = 0; i < length; i++) {
    if (!IsTitleCharacter(text[i])) { return 0; }
  }
  return 1;
}

/* the last title level.cfg's text, cfg, gives into title; whether it gives one */
static int TitleInLevelCfg(const char *cfg, char *title, size_t size) {
  char buf[LEVEL_TITLE_MAX];
  const char *line, *next, *end, *value;
  int found;

  found = 0;
  for (line = cfg; *line; line = next) {
    end = EndOfLine(line, &next);
    value = ConfigLineValue(line, (size_t)(end - line), "title", buf, sizeof(buf));
    if (value) {
      SDL_strlcpy(title, value, size);
      found = 1;
    }
  }
  return found;
}

/* how many characters of folder's name word has, to the next _ or the name's end */
static size_t WordLength(const char *word) {
  size_t length;

  length = 0;
  while (word[length] && word[length] != '_') { length++; }
  return length;
}

/* the first word of folder's name, or the second if the first is the number that
   orders the levels (and isn't the only word) */
static const char *FirstTitleWord(const char *folder) {
  size_t length;
  size_t i;

  length = WordLength(folder);
  if (length == 0 || folder[length] != '_' || !folder[length + 1]) { return folder; }
  for (i = 0; i < length; i++) {
    if (!SDL_isdigit((unsigned char)folder[i])) { return folder; }
  }
  return folder + length + 1;
}

/* the characters of word (length long) the loading screen can draw, capitalised,
   onto the end of title after a space */
static void AppendTitleWord(char *title, size_t size, const char *word, size_t length) {
  char drawable[LEVEL_TITLE_MAX];
  size_t kept, i;

  kept = 0;
  for (i = 0; i < length && kept < sizeof(drawable) - 1; i++) {
    if (IsTitleCharacter(word[i])) { drawable[kept++] = word[i]; }
  }
  drawable[kept] = 0;
  if (kept == 0) { return; }
  drawable[0] = (char)SDL_toupper((unsigned char)drawable[0]);
  if (title[0]) { SDL_strlcat(title, " ", size); }
  SDL_strlcat(title, drawable, size);
}

/* title cut to the most the loading screen draws, without spaces at its end */
static void CutToTitleLength(char *title) {
  size_t length;

  length = SDL_strlen(title);
  if (length > TITLE_LENGTH_MAX) { length = TITLE_LENGTH_MAX; }
  while (length > 0 && title[length - 1] == ' ') { length--; }
  title[length] = 0;
}

/* folder's name in words, as a title, or "" if none of it can be drawn */
static void FolderTitle(const char *folder, char *title, size_t size) {
  const char *word;
  size_t length;

  title[0] = 0;
  for (word = FirstTitleWord(folder); *word; word += length) {
    length = WordLength(word);
    AppendTitleWord(title, size, word, length);
    if (word[length] == '_') { length++; }
  }
  CutToTitleLength(title);
}

void LevelTitle(const char *folder, const char *cfg, char *title, size_t size) {
  if (TitleInLevelCfg(cfg, title, size) && IsDrawableTitle(title)) { return; }
  FolderTitle(folder, title, size);
  if (!title[0]) { SDL_strlcpy(title, folder, size); }
}
