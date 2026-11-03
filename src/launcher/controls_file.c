/*
 * controls.cfg for the launcher: read into each button's keys the way the
 * game reads it (see PadLoadBindings), using the game's own line parser, and
 * saved by changing each button's lines, keeping the rest of the file
 */
#include <SDL2/SDL.h>
#include <stdio.h>
#include "controls_file.h"
#include "text_file.h"

/* the button's index in pad_button_names, or -1 if there's no such button */
int FindPadButton(const char *name) {
  int i;

  for (i = 0; i < PAD_BUTTON_COUNT; i++) {
    if (SDL_strcasecmp(pad_button_names[i].name, name) == 0) { return i; }
  }
  return -1;
}

static int FindPadButtonByBits(uint32_t bits) {
  int i;

  for (i = 0; i < PAD_BUTTON_COUNT; i++) {
    if (pad_button_names[i].bits == bits) { return i; }
  }
  return -1;
}

/* every button back to its one default key */
void ResetControls(launcher_controls *c) {
  int i, button;

  SDL_zerop(c);
  for (i = 0; i < PAD_BUTTON_COUNT; i++) {
    button = FindPadButtonByBits(pad_default_mappings[i].bits);
    c->keys[button][0] = pad_default_mappings[i].code;
    c->key_count[button] = 1;
  }
}

/* the first line for a button replaces its default key, later lines add keys */
static void AddKey(launcher_controls *c, uint32_t *rebound, int button, SDL_Scancode code) {
  uint32_t bit = 1u << button;

  if (!(*rebound & bit)) {
    c->key_count[button] = 0;
    *rebound |= bit;
  }
  if (c->key_count[button] == BUTTON_KEYS_MAX) { return; }
  c->keys[button][c->key_count[button]++] = code;
}

/*
 * read the controls file at path into c, skipping invalid lines.
 * returns 0 (leaving c the defaults) if there isn't one.
 */
int ReadControlsFile(const char *path, launcher_controls *c) {
  FILE *file;
  char line[128];
  uint32_t bits, rebound = 0;
  SDL_Scancode code;

  ResetControls(c);
  file = fopen(path, "rb");
  if (!file) { return 0; }
  while (fgets(line, sizeof(line), file)) {
    if (PadParseBindingLine(line, &bits, &code) == 1) {
      AddKey(c, &rebound, FindPadButtonByBits(bits), code);
    }
  }
  fclose(file);
  return 1;
}

static int AreButtonKeysEqual(const launcher_controls *a, const launcher_controls *b,
  int button) {
  int i;

  if (a->key_count[button] != b->key_count[button]) { return 0; }
  for (i = 0; i < a->key_count[button]; i++) {
    if (a->keys[button][i] != b->keys[button][i]) { return 0; }
  }
  return 1;
}

/* whether a and b give every button the same keys, in the same order */
int AreControlsEqual(const launcher_controls *a, const launcher_controls *b) {
  int button;

  for (button = 0; button < PAD_BUTTON_COUNT; button++) {
    if (!AreButtonKeysEqual(a, b, button)) { return 0; }
  }
  return 1;
}

/* the keys text's lines give the button called name, in order; returns how many */
static int ButtonKeysInText(const char *text, const char *name, SDL_Scancode *keys) {
  const char *line, *next, *value;
  char buf[128];
  int count = 0;

  for (line = text; *line && count < BUTTON_KEYS_MAX; line = next) {
    value = ConfigLineValue(line, EndOfLine(line, &next) - line, name, buf, sizeof(buf));
    if (value) { keys[count++] = SDL_GetScancodeFromName(value); }
  }
  return count;
}

static int AreKeysEqual(const SDL_Scancode *a, int a_count, const SDL_Scancode *b, int b_count) {
  return a_count == b_count && SDL_memcmp(a, b, a_count * sizeof(*a)) == 0;
}

/* a line per key, each starting like line ("cross    = "), the last ending as line did */
static void AppendButtonLines(text_builder *b, const char *line, const char *line_end,
  const char *next, const SDL_Scancode *keys, int count, const char *eol) {
  const char *equals;
  int i;

  equals = SDL_strchr(line, '=');
  for (i = 0; i < count; i++) {
    AppendText(b, line, equals + 1 - line);
    AppendString(b, " ");
    AppendString(b, SDL_GetScancodeName(keys[i]));
    if (i < count - 1) { AppendString(b, eol); }
    else { AppendText(b, line_end, next - line_end); }
  }
}

static void AppendNewButtonLines(text_builder *b, const char *name,
  const SDL_Scancode *keys, int count, const char *eol) {
  int i;

  if (b->len > 0 && b->data[b->len-1] != '\n') { AppendString(b, eol); }
  for (i = 0; i < count; i++) {
    AppendString(b, name);
    AppendString(b, " = ");
    AppendString(b, SDL_GetScancodeName(keys[i]));
    AppendString(b, eol);
  }
}

/*
 * text (a controls file's) with the button called name bound to keys: its
 * first line becomes a line per key and its other lines go, or lines are
 * added at the end if it has none. the other lines, commented out ones
 * included, stay as they are. returns the new text, to SDL_free.
 */
char *SetButtonLines(const char *text, const char *name, const SDL_Scancode *keys,
  int count) {
  text_builder b = { 0 };
  SDL_Scancode current[BUTTON_KEYS_MAX];
  const char *line, *next, *line_end, *eol;
  char buf[128];
  int found = 0;

  if (AreKeysEqual(current, ButtonKeysInText(text, name, current), keys, count)) {
    return SDL_strdup(text);
  }
  eol = LineEndingOf(text);
  AppendString(&b, "");
  for (line = text; *line; line = next) {
    line_end = EndOfLine(line, &next);
    if (!ConfigLineValue(line, line_end - line, name, buf, sizeof(buf))) {
      AppendText(&b, line, next - line);
    }
    else if (!found) {
      AppendButtonLines(&b, line, line_end, next, keys, count, eol);
      found = 1;
    }
  }
  if (!found) { AppendNewButtonLines(&b, name, keys, count, eol); }
  return b.data;
}
