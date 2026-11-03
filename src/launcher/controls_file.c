/*
 * controls.cfg for the launcher: read into each button's keys the way the
 * game reads it (see PadLoadBindings), using the game's own line parser
 */
#include <SDL2/SDL.h>
#include <stdio.h>
#include "controls_file.h"

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
