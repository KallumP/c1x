#ifndef _PC_CONTROLS_H_
#define _PC_CONTROLS_H_

#include <SDL2/SDL_scancode.h>
#include "pc/pad.h"

#define PAD_BUTTON_COUNT 16
#define PAD_DEFAULT_KEY_COUNT 16 /* a key for each button */
#define PAD_P2_DEFAULT_KEY_COUNT 6 /* moving, jumping and spinning */
#define PAD_P2_PREFIX "p2 " /* starts a binding name for player two's key: "p2 cross" */

/* a key bound to a button (or buttons) */
typedef struct {
  SDL_Scancode code;
  uint32_t bits;
} sw_pad_mapping;

/* a button's name in controls files */
typedef struct {
  const char *name;
  uint32_t bits;
} pad_button_name;

/* a game controller control (see pc/gamepad.h) bound to a button */
typedef struct {
  int control;
  uint32_t bits;
} gamepad_mapping;

extern const sw_pad_mapping pad_default_mappings[PAD_DEFAULT_KEY_COUNT];
extern const sw_pad_mapping pad_p2_default_mappings[PAD_P2_DEFAULT_KEY_COUNT];
extern const gamepad_mapping gamepad_default_mappings[PAD_BUTTON_COUNT];
extern const pad_button_name pad_button_names[PAD_BUTTON_COUNT];

int PadParseBinding(const char *name, const char *key, uint32_t *bits, SDL_Scancode *code);
int PadParseBindingLine(const char *line, uint32_t *bits, SDL_Scancode *code);
int PadFindButton(const char *name, uint32_t *bits);
const char *PadBindingButtonName(const char *name, int *player_idx);
int IsGamepadValue(const char *value);
int PadParseGamepadControl(const char *value);
const char *GamepadControlName(int control);

#endif /* _PC_CONTROLS_H_ */
