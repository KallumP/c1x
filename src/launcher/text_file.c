/*
 * editing a "name = value" file's text (settings.cfg, controls.cfg) a line
 * at a time, keeping the lines it doesn't change as they are
 */
#include <SDL2/SDL.h>
#include <stdio.h>
#include "text_file.h"
#include "pc/config.h"

void AppendText(text_builder *b, const char *text, size_t len) {
  if (b->len + len + 1 > b->size) {
    b->size = (b->len + len + 1) * 2;
    b->data = SDL_realloc(b->data, b->size);
  }
  SDL_memcpy(b->data + b->len, text, len);
  b->len += len;
  b->data[b->len] = 0;
}

void AppendString(text_builder *b, const char *text) {
  AppendText(b, text, SDL_strlen(text));
}

/* where line's text ends (before its line ending), and where the next line starts */
const char *EndOfLine(const char *line, const char **next) {
  const char *line_end;

  *next = SDL_strchr(line, '\n');
  *next = *next ? *next+1 : line + SDL_strlen(line);
  line_end = *next;
  while (line_end > line && (line_end[-1] == '\n' || line_end[-1] == '\r')) { line_end--; }
  return line_end;
}

/* the line ending text uses, for lines added to it */
const char *LineEndingOf(const char *text) {
  return SDL_strstr(text, "\r\n") ? "\r\n" : "\n";
}

/* the value of the len characters at line if they set name ("name = value"), or 0 */
const char *ConfigLineValue(const char *line, size_t len, const char *name,
  char *buf, size_t size) {
  char copy[128];
  char *line_name, *line_value;

  if (len >= sizeof(copy)) { len = sizeof(copy)-1; }
  SDL_memcpy(copy, line, len);
  copy[len] = 0;
  if (ConfigParseLine(copy, buf, size, &line_name, &line_value) != 1) { return 0; }
  return SDL_strcasecmp(line_name, name) == 0 ? line_value : 0;
}

/* the text of the file at path (to SDL_free), or 0 if it can't be read */
char *ReadWholeFile(const char *path) {
  return SDL_LoadFile(path, 0);
}

int WriteWholeFile(const char *path, const char *text) {
  FILE *file;
  int written;

  file = fopen(path, "wb");
  if (!file) { return 0; }
  written = fputs(text, file) >= 0;
  return fclose(file) == 0 && written;
}
