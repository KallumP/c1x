#include <SDL2/SDL.h>
#include "pc/pad.h"
#include "pc/controls.h"
#include "pc/config.h"
#include "pc/replay.h"
#include "pc/gamepad.h"

extern uint8_t keys[512]; /* indexed by SDL scancode */

/* current bindings; set to the defaults on first use */
sw_pad_mapping pad_mappings[64];
int pad_mapping_count;
static int pad_mappings_set = 0;
gamepad_mapping gamepad_mappings[64];
int gamepad_mapping_count;

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
  held |= PadGamepadHeld();
  return (held << 16);
}

#define STICK_PUSHED_FROM 13000 /* about 40% of the way out; an axis runs -32768 to 32767 */

/* the d-pad directions the left stick is pushed towards (SDL's y is down) */
static uint32_t LeftStickDirections() {
  uint32_t held;
  int x, y;

  x = GamepadAxis(SDL_CONTROLLER_AXIS_LEFTX);
  y = GamepadAxis(SDL_CONTROLLER_AXIS_LEFTY);
  held = 0;
  if (x <= -STICK_PUSHED_FROM) { held |= PAD_LEFT; }
  if (x >= STICK_PUSHED_FROM) { held |= PAD_RIGHT; }
  if (y <= -STICK_PUSHED_FROM) { held |= PAD_UP; }
  if (y >= STICK_PUSHED_FROM) { held |= PAD_DOWN; }
  return held;
}

/* the buttons held on game controllers: by the controller bindings, and the left stick as the d-pad */
uint32_t PadGamepadHeld() {
  uint32_t held;
  int i;

  if (!pad_mappings_set) { PadResetBindings(); }
  held = LeftStickDirections();
  for (i=0;i<gamepad_mapping_count;i++) {
    if (GamepadIsHeld(gamepad_mappings[i].control))
      held |= gamepad_mappings[i].bits;
  }
  return held;
}

/* restore the built-in default bindings, for keys and controllers */
void PadResetBindings() {
  memcpy(pad_mappings, pad_default_mappings, sizeof(pad_default_mappings));
  pad_mapping_count = sizeof(pad_default_mappings)/sizeof(sw_pad_mapping);
  memcpy(gamepad_mappings, gamepad_default_mappings, sizeof(gamepad_default_mappings));
  gamepad_mapping_count = sizeof(gamepad_default_mappings)/sizeof(gamepad_mapping);
  pad_mappings_set = 1;
}

/* the buttons a controls file has rebound so far, for keys and for controllers */
typedef struct {
  uint32_t keys;
  uint32_t gamepad;
} rebound_buttons;

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

/* remove every controller control bound to the given button */
static void PadUnbindGamepadButton(uint32_t bits) {
  int i, count;

  count = 0;
  for (i=0;i<gamepad_mapping_count;i++) {
    if (gamepad_mappings[i].bits != bits)
      gamepad_mappings[count++] = gamepad_mappings[i];
  }
  gamepad_mapping_count = count;
}

/* whether this is the file's first line for the button; marks it rebound */
static int IsFirstLineFor(uint32_t bits, uint32_t *rebound) {
  if (*rebound & bits) { return 0; }
  *rebound |= bits;
  return 1;
}

static void ReportTooManyBindings(const char *path, int line_num) {
  fprintf(stderr, "%s:%d: too many bindings, skipping\n", path, line_num);
}

/* bind a key to a button: the file's first key line for it replaces its keys */
static int PadApplyKeyBinding(uint32_t bits, SDL_Scancode code,
  rebound_buttons *rebound, const char *path, int line_num) {
  int max;

  if (IsFirstLineFor(bits, &rebound->keys)) { PadUnbindButton(bits); }
  max = sizeof(pad_mappings)/sizeof(sw_pad_mapping);
  if (pad_mapping_count == max) {
    ReportTooManyBindings(path, line_num);
    return 0;
  }
  pad_mappings[pad_mapping_count].code = code;
  pad_mappings[pad_mapping_count].bits = bits;
  pad_mapping_count++;
  return 1;
}

/* bind a controller control to a button: the file's first pad line for it replaces its controls */
static int PadApplyGamepadBinding(uint32_t bits, int control,
  rebound_buttons *rebound, const char *path, int line_num) {
  int max;

  if (IsFirstLineFor(bits, &rebound->gamepad)) { PadUnbindGamepadButton(bits); }
  max = sizeof(gamepad_mappings)/sizeof(gamepad_mapping);
  if (gamepad_mapping_count == max) {
    ReportTooManyBindings(path, line_num);
    return 0;
  }
  gamepad_mappings[gamepad_mapping_count].control = control;
  gamepad_mappings[gamepad_mapping_count].bits = bits;
  gamepad_mapping_count++;
  return 1;
}

/*
 * apply one controls file binding (ConfigLoad handler): a key, or a
 * controller control for a "pad:" value. data points to the buttons already
 * rebound by this file: the first key line for a button replaces its keys,
 * and the first pad line its controller controls; further lines add more.
 */
static int PadApplyBinding(char *name, char *value, const char *path,
  int line_num, void *data) {
  uint32_t bits;
  SDL_Scancode code;
  int control;

  if (IsGamepadValue(value)) {
    if (PadFindButton(name, &bits) == -1) { return -1; }
    control = PadParseGamepadControl(value);
    if (control == -1) { return -1; }
    return PadApplyGamepadBinding(bits, control, data, path, line_num);
  }
  if (PadParseBinding(name, value, &bits, &code) == -1) { return -1; }
  return PadApplyKeyBinding(bits, code, data, path, line_num);
}

/*
 * load key and controller bindings from a controls file (see PadApplyBinding).
 * invalid lines are reported and skipped.
 * returns the number of bindings applied, or -1 if the file can't be opened.
 */
int PadLoadBindings(const char *path) {
  rebound_buttons rebound = { 0 };

  if (!pad_mappings_set) { PadResetBindings(); }
  return ConfigLoad(path, "binding", "button = key name or pad:button", PadApplyBinding,
    &rebound);
}
