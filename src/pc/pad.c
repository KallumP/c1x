#include <SDL2/SDL.h>
#include "pc/pad.h"
#include "pc/controls.h"
#include "pc/config.h"
#include "pc/replay.h"

extern uint8_t keys[512]; /* indexed by SDL scancode */

/* current bindings; set to the defaults on first use */
sw_pad_mapping pad_mappings[64];
int pad_mapping_count;
static int pad_mappings_set = 0;

uint32_t SwPadRead(int idx) {
  uint32_t held, bits;
  int i, count, code;

  held = 0;
  if (idx != 0) { return held; } /* pad 1 only for now */
  if (ReplayHeld(&held)) { return held; } /* replaying recorded inputs */
  if (!pad_mappings_set) { PadResetBindings(); }
  count = pad_mapping_count;
  for (i=0;i<count;i++) {
    code = pad_mappings[i].code;
    if (keys[code]) {
      bits = pad_mappings[i].bits;
      held |= bits;
    }
  }
  return (held << 16);
}

/* restore the built-in default bindings */
void PadResetBindings() {
  memcpy(pad_mappings, pad_default_mappings, sizeof(pad_default_mappings));
  pad_mapping_count = sizeof(pad_default_mappings)/sizeof(sw_pad_mapping);
  pad_mappings_set = 1;
}

/* remove every key bound to the given button */
static void PadUnbindButton(uint32_t bits) {
  int i, count;

  count = 0;
  for (i=0;i<pad_mapping_count;i++) {
    if (pad_mappings[i].bits != bits)
      pad_mappings[count++] = pad_mappings[i];
  }
  pad_mapping_count = count;
}

/*
 * apply one controls file binding (ConfigLoad handler). data points to the
 * buttons already rebound by this file: the first line for a button
 * replaces its current keys, and further lines for it add more keys.
 */
static int PadApplyBinding(char *name, char *key, const char *path,
  int line_num, void *data) {
  uint32_t bits, *rebound;
  SDL_Scancode code;
  int max;

  if (PadParseBinding(name, key, &bits, &code) == -1) { return -1; }
  rebound = (uint32_t*)data;
  if (!(*rebound & bits)) {
    PadUnbindButton(bits);
    *rebound |= bits;
  }
  max = sizeof(pad_mappings)/sizeof(sw_pad_mapping);
  if (pad_mapping_count == max) {
    fprintf(stderr, "%s:%d: too many bindings, skipping\n", path, line_num);
    return 0;
  }
  pad_mappings[pad_mapping_count].code = code;
  pad_mappings[pad_mapping_count].bits = bits;
  pad_mapping_count++;
  return 1;
}

/*
 * load key bindings from a controls file (see PadApplyBinding).
 * invalid lines are reported and skipped.
 * returns the number of bindings applied, or -1 if the file can't be opened.
 */
int PadLoadBindings(const char *path) {
  uint32_t rebound;

  if (!pad_mappings_set) { PadResetBindings(); }
  rebound = 0;
  return ConfigLoad(path, "binding", "button = key name", PadApplyBinding,
    &rebound);
}
