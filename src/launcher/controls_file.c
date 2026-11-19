/*
 * controls.cfg for the launcher: read into each button's keys and controller
 * buttons the way the game reads it (see PadLoadBindings), using the game's
 * own line parser, and saved by changing each button's lines, keeping the
 * rest of the file. a button's key lines and its controller ("pad:") lines
 * are kept apart: changing one never touches the other
 */
#include <SDL2/SDL.h>
#include <stdio.h>
#include "controls_file.h"
#include "text_file.h"
#include "pc/config.h"

#define BINDING_TEXT_MAX 64

/* which of a button's lines: its keys, or its controller buttons */
typedef enum { KEY_LINES, PAD_LINES } line_kind;

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

static void ResetKeys(launcher_controls *c) {
  int i, button;

  for (i = 0; i < PAD_DEFAULT_KEY_COUNT; i++) {
    button = FindPadButtonByBits(pad_default_mappings[i].bits);
    c->keys[button][c->key_count[button]++] = pad_default_mappings[i].code;
  }
}

static void ResetPads(launcher_controls *c) {
  int i, button;

  for (i = 0; i < PAD_BUTTON_COUNT; i++) {
    button = FindPadButtonByBits(gamepad_default_mappings[i].bits);
    c->pads[button][c->pad_count[button]++] = gamepad_default_mappings[i].control;
  }
}

/* every button back to its default key and controller button */
void ResetControls(launcher_controls *c) {
  SDL_zerop(c);
  ResetKeys(c);
  ResetPads(c);
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

/* the first pad line for a button replaces its default controller button, later ones add more */
static void AddPad(launcher_controls *c, uint32_t *rebound, int button, int control) {
  uint32_t bit = 1u << button;

  if (!(*rebound & bit)) {
    c->pad_count[button] = 0;
    *rebound |= bit;
  }
  if (c->pad_count[button] == BUTTON_PADS_MAX) { return; }
  c->pads[button][c->pad_count[button]++] = control;
}

/* the buttons a controls file has rebound so far, for keys and for controllers */
typedef struct {
  uint32_t keys;
  uint32_t pads;
} rebound_buttons;

/* add one controls file line's binding to c, if it's a valid one */
static void ReadControlsLine(const char *line, launcher_controls *c, rebound_buttons *rebound) {
  char buf[128], *name, *value;
  uint32_t bits;
  SDL_Scancode code;
  int control;

  if (ConfigParseLine(line, buf, sizeof(buf), &name, &value) != 1) { return; }
  if (PadFindButton(name, &bits) == -1) { return; }
  if (IsGamepadValue(value)) {
    control = PadParseGamepadControl(value);
    if (control != -1) { AddPad(c, &rebound->pads, FindPadButtonByBits(bits), control); }
    return;
  }
  code = SDL_GetScancodeFromName(value);
  if (code != SDL_SCANCODE_UNKNOWN) { AddKey(c, &rebound->keys, FindPadButtonByBits(bits), code); }
}

/*
 * read the controls file at path into c, skipping invalid lines.
 * returns 0 (leaving c the defaults) if there isn't one.
 */
int ReadControlsFile(const char *path, launcher_controls *c) {
  FILE *file;
  char line[128];
  rebound_buttons rebound = { 0 };

  ResetControls(c);
  file = fopen(path, "rb");
  if (!file) { return 0; }
  while (fgets(line, sizeof(line), file)) { ReadControlsLine(line, c, &rebound); }
  fclose(file);
  return 1;
}

static int AreBindingsEqual(const int *a, int a_count, const int *b, int b_count) {
  return a_count == b_count && SDL_memcmp(a, b, a_count * sizeof(*a)) == 0;
}

static int AreButtonKeysEqual(const launcher_controls *a, const launcher_controls *b,
  int button) {
  return AreBindingsEqual((const int *)a->keys[button], a->key_count[button],
    (const int *)b->keys[button], b->key_count[button]);
}

static int AreButtonPadsEqual(const launcher_controls *a, const launcher_controls *b,
  int button) {
  return AreBindingsEqual(a->pads[button], a->pad_count[button],
    b->pads[button], b->pad_count[button]);
}

/* whether a and b give every button the same keys and controller buttons, in the same order */
int AreControlsEqual(const launcher_controls *a, const launcher_controls *b) {
  int button;

  for (button = 0; button < PAD_BUTTON_COUNT; button++) {
    if (!AreButtonKeysEqual(a, b, button)) { return 0; }
    if (!AreButtonPadsEqual(a, b, button)) { return 0; }
  }
  return 1;
}

/* whether a line's value is the kind of binding wanted */
static int IsValueOfKind(const char *value, line_kind kind) {
  if (kind == PAD_LINES) { return IsGamepadValue(value); }
  return !IsGamepadValue(value);
}

/* a binding (a scancode, or a controller control) from a line's value */
static int ParseBindingValue(const char *value, line_kind kind) {
  if (kind == PAD_LINES) { return PadParseGamepadControl(value); }
  return SDL_GetScancodeFromName(value);
}

/* a binding as a line's value: "Space", or "pad:a" */
static void BindingValueText(int binding, line_kind kind, char *buf, size_t size) {
  if (kind == PAD_LINES) { SDL_snprintf(buf, size, "pad:%s", GamepadControlName(binding)); }
  else { SDL_strlcpy(buf, SDL_GetScancodeName(binding), size); }
}

/* the value of line (len long) if it's a kind line for the button called name, else NULL */
static const char *ButtonLineValue(const char *line, size_t len, const char *name,
  line_kind kind, char *buf, size_t size) {
  const char *value;

  value = ConfigLineValue(line, len, name, buf, size);
  if (!value || !IsValueOfKind(value, kind)) { return NULL; }
  return value;
}

/* the bindings the text's kind lines give the button called name, in order; returns how many */
static int ButtonBindingsInText(const char *text, const char *name, line_kind kind,
  int *bindings) {
  const char *line, *next, *value;
  char buf[128];
  int count = 0;

  for (line = text; *line && count < BUTTON_KEYS_MAX; line = next) {
    value = ButtonLineValue(line, EndOfLine(line, &next) - line, name, kind, buf, sizeof(buf));
    if (value) { bindings[count++] = ParseBindingValue(value, kind); }
  }
  return count;
}

/* a line per binding, each starting like line ("cross    = "), the last ending as line did */
static void AppendButtonLines(text_builder *b, const char *line, const char *line_end,
  const char *next, const int *bindings, int count, line_kind kind, const char *eol) {
  const char *equals;
  char value[BINDING_TEXT_MAX];
  int i;

  equals = SDL_strchr(line, '=');
  for (i = 0; i < count; i++) {
    AppendText(b, line, equals + 1 - line);
    AppendString(b, " ");
    BindingValueText(bindings[i], kind, value, sizeof(value));
    AppendString(b, value);
    if (i < count - 1) { AppendString(b, eol); }
    else { AppendText(b, line_end, next - line_end); }
  }
}

static void AppendNewButtonLines(text_builder *b, const char *name,
  const int *bindings, int count, line_kind kind, const char *eol) {
  char value[BINDING_TEXT_MAX];
  int i;

  if (b->len > 0 && b->data[b->len-1] != '\n') { AppendString(b, eol); }
  for (i = 0; i < count; i++) {
    AppendString(b, name);
    AppendString(b, " = ");
    BindingValueText(bindings[i], kind, value, sizeof(value));
    AppendString(b, value);
    AppendString(b, eol);
  }
}

/*
 * text (a controls file's) with the button called name bound to bindings: its
 * first kind line becomes a line per binding and its other kind lines go, or
 * lines are added at the end if it has none. the other lines, the button's
 * other kind and commented out ones included, stay as they are. returns the
 * new text, to SDL_free.
 */
static char *SetButtonLinesOfKind(const char *text, const char *name, const int *bindings,
  int count, line_kind kind) {
  text_builder b = { 0 };
  int current[BUTTON_KEYS_MAX];
  const char *line, *next, *line_end, *eol;
  char buf[128];
  int found = 0;

  if (AreBindingsEqual(current, ButtonBindingsInText(text, name, kind, current), bindings, count)) {
    return SDL_strdup(text);
  }
  eol = LineEndingOf(text);
  AppendString(&b, "");
  for (line = text; *line; line = next) {
    line_end = EndOfLine(line, &next);
    if (!ButtonLineValue(line, line_end - line, name, kind, buf, sizeof(buf))) {
      AppendText(&b, line, next - line);
    }
    else if (!found) {
      AppendButtonLines(&b, line, line_end, next, bindings, count, kind, eol);
      found = 1;
    }
  }
  if (!found) { AppendNewButtonLines(&b, name, bindings, count, kind, eol); }
  return b.data;
}

/* text with the button called name bound to keys (see SetButtonLinesOfKind) */
char *SetButtonLines(const char *text, const char *name, const SDL_Scancode *keys,
  int count) {
  int bindings[BUTTON_KEYS_MAX];
  int i;

  for (i = 0; i < count; i++) { bindings[i] = keys[i]; }
  return SetButtonLinesOfKind(text, name, bindings, count, KEY_LINES);
}

/* text with the button called name bound to controller controls (see SetButtonLinesOfKind) */
char *SetButtonPadLines(const char *text, const char *name, const int *pads, int count) {
  return SetButtonLinesOfKind(text, name, pads, count, PAD_LINES);
}

/* whether text needs kind lines for button: not if it has none and the button keeps its default */
static int NeedsButtonLines(const char *text, int is_default, int button, line_kind kind) {
  int current[BUTTON_KEYS_MAX];

  if (ButtonBindingsInText(text, pad_button_names[button].name, kind, current) > 0) { return 1; }
  return !is_default;
}

/* replace button's key lines in text with its keys in c, if it needs them.
   takes text over (freeing it) and returns the text to use from now on, to SDL_free */
static char *ReplaceButtonKeyLines(char *text, const launcher_controls *c,
  const launcher_controls *defaults, int button) {
  char *changed;

  if (!NeedsButtonLines(text, AreButtonKeysEqual(c, defaults, button), button, KEY_LINES)) {
    return text;
  }
  changed = SetButtonLines(text, pad_button_names[button].name, c->keys[button],
    c->key_count[button]);
  SDL_free(text);
  return changed;
}

/* replace button's pad lines in text with its controller buttons in c, if it needs them.
   takes text over (freeing it) and returns the text to use from now on, to SDL_free */
static char *ReplaceButtonPadLines(char *text, const launcher_controls *c,
  const launcher_controls *defaults, int button) {
  char *changed;

  if (!NeedsButtonLines(text, AreButtonPadsEqual(c, defaults, button), button, PAD_LINES)) {
    return text;
  }
  changed = SetButtonPadLines(text, pad_button_names[button].name, c->pads[button],
    c->pad_count[button]);
  SDL_free(text);
  return changed;
}

/* text (a controls file's, to SDL_free) with every button bound to its keys and controller buttons in c */
static char *ControlsTextWith(char *text, const launcher_controls *c) {
  launcher_controls defaults;
  int button;

  ResetControls(&defaults);
  for (button = 0; button < PAD_BUTTON_COUNT; button++) {
    text = ReplaceButtonKeyLines(text, c, &defaults, button);
    text = ReplaceButtonPadLines(text, c, &defaults, button);
  }
  return text;
}

/*
 * save c to the controls file at path, keeping its other lines. without
 * one, it starts from the example controls file at example_path (if there
 * is one), keeping its comments. returns 0 if it can't be written.
 */
int SaveControlsFile(const char *path, const char *example_path,
  const launcher_controls *c) {
  char *text;
  int saved;

  text = ReadWholeFile(path);
  if (!text) { text = ReadWholeFile(example_path); }
  if (!text) { text = SDL_strdup(""); }
  text = ControlsTextWith(text, c);
  saved = WriteWholeFile(path, text);
  SDL_free(text);
  return saved;
}
