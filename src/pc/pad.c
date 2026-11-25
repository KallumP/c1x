#include <SDL2/SDL.h>
#include "pc/pad.h"
#include "pc/controls.h"
#include "pc/config.h"
#include "pc/replay.h"
#include "pc/gamepad.h"

extern uint8_t keys[512]; /* indexed by SDL scancode */

#define PAD_KEYS_MAX 64

/* a player's keys */
typedef struct {
  sw_pad_mapping keys[PAD_KEYS_MAX];
  int count;
} key_bindings;

/* current bindings, set to the defaults on first use; both players share the controller bindings */
static key_bindings player_keys[PAD_PLAYER_COUNT];
static int pad_mappings_set = 0;
gamepad_mapping gamepad_mappings[64];
int gamepad_mapping_count;

uint32_t PadKeysHeld(int player_idx) {
  key_bindings *bindings;
  uint32_t held;
  int i;

  if (!pad_mappings_set) { PadResetBindings(); }
  bindings = &player_keys[player_idx];
  held = 0;
  for (i=0;i<bindings->count;i++) {
    if (keys[bindings->keys[i].code])
      held |= bindings->keys[i].bits;
  }
  return held;
}

uint32_t SwPadRead(int idx) {
  uint32_t held;

  held = 0;
  if (idx != 0) { return held; } /* pad 1 only for now */
  if (ReplayHeld(&held)) { return held; } /* replaying recorded inputs */
  held = PadKeysHeld(0) | PadGamepadHeld(0);
  return (held << 16);
}

#define STICK_PUSHED_FROM 13000 /* about 40% of the way out; an axis runs -32768 to 32767 */

/* the d-pad directions the left stick is pushed towards (SDL's y is down) */
static uint32_t LeftStickDirections(int gamepad_idx) {
  uint32_t held;
  int x, y;

  x = GamepadAxis(gamepad_idx, SDL_CONTROLLER_AXIS_LEFTX);
  y = GamepadAxis(gamepad_idx, SDL_CONTROLLER_AXIS_LEFTY);
  held = 0;
  if (x <= -STICK_PUSHED_FROM) { held |= PAD_LEFT; }
  if (x >= STICK_PUSHED_FROM) { held |= PAD_RIGHT; }
  if (y <= -STICK_PUSHED_FROM) { held |= PAD_UP; }
  if (y >= STICK_PUSHED_FROM) { held |= PAD_DOWN; }
  return held;
}

/* the buttons held on a game controller: by the controller bindings, and the left stick as the d-pad */
uint32_t PadGamepadHeld(int gamepad_idx) {
  uint32_t held;
  int i;

  if (!pad_mappings_set) { PadResetBindings(); }
  held = LeftStickDirections(gamepad_idx);
  for (i=0;i<gamepad_mapping_count;i++) {
    if (GamepadIsHeld(gamepad_idx, gamepad_mappings[i].control))
      held |= gamepad_mappings[i].bits;
  }
  return held;
}

/* restore the built-in default bindings, for keys and controllers */
static void SetKeys(key_bindings *bindings, const sw_pad_mapping *defaults, int count) {
  memcpy(bindings->keys, defaults, count*sizeof(sw_pad_mapping));
  bindings->count = count;
}

void PadResetBindings() {
  SetKeys(&player_keys[0], pad_default_mappings, PAD_DEFAULT_KEY_COUNT);
  SetKeys(&player_keys[1], pad_p2_default_mappings, PAD_P2_DEFAULT_KEY_COUNT);
  memcpy(gamepad_mappings, gamepad_default_mappings, sizeof(gamepad_default_mappings));
  gamepad_mapping_count = sizeof(gamepad_default_mappings)/sizeof(gamepad_mapping);
  pad_mappings_set = 1;
}

/* the buttons a controls file has rebound so far, for each player's keys and for controllers */
typedef struct {
  uint32_t keys[PAD_PLAYER_COUNT];
  uint32_t gamepad;
} rebound_buttons;

static void PadUnbindButton(key_bindings *bindings, uint32_t bits) {
  int i, count;

  count = 0;
  for (i=0;i<bindings->count;i++) {
    if (bindings->keys[i].bits != bits)
      bindings->keys[count++] = bindings->keys[i];
  }
  bindings->count = count;
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

/* bind a key to a player's button: the file's first key line for it replaces their keys */
static int PadApplyKeyBinding(int player_idx, uint32_t bits, SDL_Scancode code,
  rebound_buttons *rebound, const char *path, int line_num) {
  key_bindings *bindings;

  bindings = &player_keys[player_idx];
  if (IsFirstLineFor(bits, &rebound->keys[player_idx])) { PadUnbindButton(bindings, bits); }
  if (bindings->count == PAD_KEYS_MAX) {
    ReportTooManyBindings(path, line_num);
    return 0;
  }
  bindings->keys[bindings->count].code = code;
  bindings->keys[bindings->count].bits = bits;
  bindings->count++;
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
 * controller control for a "pad:" value; a "p2 " name binds player two's key.
 * data points to the buttons already rebound by this file: the first key line
 * for a button replaces its keys, and the first pad line its controller
 * controls; further lines add more.
 */
static int PadApplyBinding(char *name, char *value, const char *path,
  int line_num, void *data) {
  const char *button;
  uint32_t bits;
  SDL_Scancode code;
  int control, player_idx;

  button = PadBindingButtonName(name, &player_idx);
  if (IsGamepadValue(value)) {
    if (player_idx != 0) { return -1; } /* both players share the controller layout */
    if (PadFindButton(button, &bits) == -1) { return -1; }
    control = PadParseGamepadControl(value);
    if (control == -1) { return -1; }
    return PadApplyGamepadBinding(bits, control, data, path, line_num);
  }
  if (PadParseBinding(button, value, &bits, &code) == -1) { return -1; }
  return PadApplyKeyBinding(player_idx, bits, code, data, path, line_num);
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
