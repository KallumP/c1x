/*
 * settings.cfg for the launcher: read with the game's own settings parser,
 * and saved by changing (or adding) each setting's line, keeping the rest
 * of the file as it is
 */
#include <SDL2/SDL.h>
#include <stdio.h>
#include "settings_file.h"
#include "pc/config.h"

/*
 * read the settings file at path into s, skipping invalid lines.
 * returns 0 (leaving s the defaults) if there isn't one.
 */
int ReadSettingsFile(const char *path, pc_settings *s) {
  FILE *file;
  char line[128];

  SettingsReset(s);
  file = fopen(path, "rb");
  if (!file) { return 0; }
  while (fgets(line, sizeof(line), file)) {
    SettingsParseLine(line, s);
  }
  fclose(file);
  return 1;
}

/* text built up a piece at a time */
typedef struct {
  char *data;
  size_t len, size;
} text_builder;

static void AppendText(text_builder *b, const char *text, size_t len) {
  if (b->len + len + 1 > b->size) {
    b->size = (b->len + len + 1) * 2;
    b->data = SDL_realloc(b->data, b->size);
  }
  SDL_memcpy(b->data + b->len, text, len);
  b->len += len;
  b->data[b->len] = 0;
}

static void AppendString(text_builder *b, const char *text) {
  AppendText(b, text, SDL_strlen(text));
}

/* the value of line if it sets the setting called name, or 0 */
static const char *ValueIfSetting(const char *line, size_t len, const char *name,
  char *buf, size_t size) {
  char copy[128];
  char *line_name, *line_value;

  if (len >= sizeof(copy)) { len = sizeof(copy)-1; }
  SDL_memcpy(copy, line, len);
  copy[len] = 0;
  if (ConfigParseLine(copy, buf, size, &line_name, &line_value) != 1) { return 0; }
  return SDL_strcasecmp(line_name, name) == 0 ? line_value : 0;
}

static void AppendSettingLine(text_builder *b, const char *name, const char *value) {
  AppendString(b, name);
  AppendString(b, " = ");
  AppendString(b, value);
}

/*
 * text (a settings file's) with its line setting name changed to set it to
 * value, or a line added at the end if there isn't one. the other lines,
 * commented out ones included, and the line endings stay as they are.
 * returns the new text, to SDL_free.
 */
char *SetSettingLine(const char *text, const char *name, const char *value) {
  text_builder b = { 0 };
  const char *line, *next, *line_end, *eol, *line_value;
  char buf[128];
  int found;

  eol = SDL_strstr(text, "\r\n") ? "\r\n" : "\n";
  AppendString(&b, "");
  found = 0;
  for (line=text;*line;line=next) {
    next = SDL_strchr(line, '\n');
    next = next ? next+1 : line + SDL_strlen(line);
    line_end = next;
    while (line_end > line && (line_end[-1] == '\n' || line_end[-1] == '\r')) { line_end--; }
    line_value = found ? 0 : ValueIfSetting(line, line_end - line, name, buf, sizeof(buf));
    if (line_value && SDL_strcasecmp(line_value, value) != 0) {
      AppendSettingLine(&b, name, value);
      AppendText(&b, line_end, next - line_end);
    }
    else {
      AppendText(&b, line, next - line);
    }
    found = found || line_value;
  }
  if (!found) {
    if (b.len > 0 && b.data[b.len-1] != '\n') { AppendString(&b, eol); }
    AppendSettingLine(&b, name, value);
    AppendString(&b, eol);
  }
  return b.data;
}

/* text with name set to value, freeing text */
static char *ReplaceSettingLine(char *text, const char *name, const char *value) {
  char *changed;

  changed = SetSettingLine(text, name, value);
  SDL_free(text);
  return changed;
}

static char *ReplaceOnOffLine(char *text, const char *name, int on) {
  return ReplaceSettingLine(text, name, on ? "on" : "off");
}

static char *ReplaceNumberLine(char *text, const char *name, uint32_t number) {
  char value[16];

  SDL_snprintf(value, sizeof(value), "%u", number);
  return ReplaceSettingLine(text, name, value);
}

/* text (a settings file's, to SDL_free) with every setting in s set */
static char *SettingsTextWith(char *text, const pc_settings *s) {
  text = ReplaceOnOffLine(text, "loading_screen", s->loading_screen);
  text = ReplaceNumberLine(text, "loading_screen_min_ms", s->loading_screen_min_ms);
  text = ReplaceOnOffLine(text, "speed_display", s->speed_display);
  text = ReplaceOnOffLine(text, "skip_splash_screens", s->skip_splash_screens);
  text = ReplaceOnOffLine(text, "fix_model_draw_order", s->fix_model_draw_order);
  text = ReplaceOnOffLine(text, "replay_inputs", s->replay_inputs);
  text = ReplaceNumberLine(text, "replay_speed", s->replay_speed);
  if (s->boot_level[0]) {
    text = ReplaceSettingLine(text, "boot_level", s->boot_level);
  }
  return text;
}

/* the text of the file at path (to SDL_free), or 0 if it can't be read */
static char *ReadWholeFile(const char *path) {
  return SDL_LoadFile(path, 0);
}

static int WriteWholeFile(const char *path, const char *text) {
  FILE *file;
  int written;

  file = fopen(path, "wb");
  if (!file) { return 0; }
  written = fputs(text, file) >= 0;
  return fclose(file) == 0 && written;
}

/*
 * save s to the settings file at path, keeping its other lines. without
 * one, it starts from the example settings file at example_path (if there
 * is one), keeping its comments. returns 0 if it can't be written.
 */
int SaveSettingsFile(const char *path, const char *example_path, const pc_settings *s) {
  char *text;
  int saved;

  text = ReadWholeFile(path);
  if (!text) { text = ReadWholeFile(example_path); }
  if (!text) { text = SDL_strdup(""); }
  text = SettingsTextWith(text, s);
  saved = WriteWholeFile(path, text);
  SDL_free(text);
  return saved;
}
