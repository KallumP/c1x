/*
 * controls files (controls.cfg): the buttons' names, their default keys, and
 * reading a binding line. shared by the game (pad.c) and the launcher
 */
#include <SDL2/SDL.h>
#include "pc/controls.h"
#include "pc/config.h"
#include "pc/gamepad.h"

/* a WASD layout: WASD to move, space to jump, K to spin; a key for each button */
const sw_pad_mapping pad_default_mappings[PAD_DEFAULT_KEY_COUNT] = {
  { .code = SDL_SCANCODE_F,         .bits = PAD_SELECT   },
  { .code = SDL_SCANCODE_R,         .bits = PAD_L3       },
  { .code = SDL_SCANCODE_U,         .bits = PAD_R3       },
  { .code = SDL_SCANCODE_J,         .bits = PAD_START    },
  { .code = SDL_SCANCODE_W,         .bits = PAD_UP       },
  { .code = SDL_SCANCODE_D,         .bits = PAD_RIGHT    },
  { .code = SDL_SCANCODE_S,         .bits = PAD_DOWN     },
  { .code = SDL_SCANCODE_A,         .bits = PAD_LEFT     },
  { .code = SDL_SCANCODE_E,         .bits = PAD_L2       },
  { .code = SDL_SCANCODE_I,         .bits = PAD_R2       },
  { .code = SDL_SCANCODE_Q,         .bits = PAD_L1       },
  { .code = SDL_SCANCODE_P,         .bits = PAD_R1       },
  { .code = SDL_SCANCODE_O,         .bits = PAD_TRIANGLE },
  { .code = SDL_SCANCODE_SEMICOLON, .bits = PAD_CIRCLE   },
  { .code = SDL_SCANCODE_SPACE,     .bits = PAD_CROSS    },
  { .code = SDL_SCANCODE_K,         .bits = PAD_SQUARE   },
};

/* a controller's buttons where a PlayStation pad's are: the bottom face button is cross */
const gamepad_mapping gamepad_default_mappings[PAD_BUTTON_COUNT] = {
  { .control = SDL_CONTROLLER_BUTTON_BACK,          .bits = PAD_SELECT   },
  { .control = SDL_CONTROLLER_BUTTON_LEFTSTICK,     .bits = PAD_L3       },
  { .control = SDL_CONTROLLER_BUTTON_RIGHTSTICK,    .bits = PAD_R3       },
  { .control = SDL_CONTROLLER_BUTTON_START,         .bits = PAD_START    },
  { .control = SDL_CONTROLLER_BUTTON_DPAD_UP,       .bits = PAD_UP       },
  { .control = SDL_CONTROLLER_BUTTON_DPAD_RIGHT,    .bits = PAD_RIGHT    },
  { .control = SDL_CONTROLLER_BUTTON_DPAD_DOWN,     .bits = PAD_DOWN     },
  { .control = SDL_CONTROLLER_BUTTON_DPAD_LEFT,     .bits = PAD_LEFT     },
  { .control = GAMEPAD_LEFT_TRIGGER,                .bits = PAD_L2       },
  { .control = GAMEPAD_RIGHT_TRIGGER,               .bits = PAD_R2       },
  { .control = SDL_CONTROLLER_BUTTON_LEFTSHOULDER,  .bits = PAD_L1       },
  { .control = SDL_CONTROLLER_BUTTON_RIGHTSHOULDER, .bits = PAD_R1       },
  { .control = SDL_CONTROLLER_BUTTON_Y,             .bits = PAD_TRIANGLE },
  { .control = SDL_CONTROLLER_BUTTON_B,             .bits = PAD_CIRCLE   },
  { .control = SDL_CONTROLLER_BUTTON_A,             .bits = PAD_CROSS    },
  { .control = SDL_CONTROLLER_BUTTON_X,             .bits = PAD_SQUARE   },
};

/* button names used in controls files */
const pad_button_name pad_button_names[PAD_BUTTON_COUNT] = {
  { "select",   PAD_SELECT   },
  { "l3",       PAD_L3       },
  { "r3",       PAD_R3       },
  { "start",    PAD_START    },
  { "up",       PAD_UP       },
  { "right",    PAD_RIGHT    },
  { "down",     PAD_DOWN     },
  { "left",     PAD_LEFT     },
  { "l2",       PAD_L2       },
  { "r2",       PAD_R2       },
  { "l1",       PAD_L1       },
  { "r1",       PAD_R1       },
  { "triangle", PAD_TRIANGLE },
  { "circle",   PAD_CIRCLE   },
  { "cross",    PAD_CROSS    },
  { "square",   PAD_SQUARE   },
};

/*
 * look up a controls file binding: a button name and an SDL scancode name
 * (e.g. "Z", "Left Shift", "Keypad 4").
 * returns 1 and sets bits/code, or -1 if either name is unknown.
 */
int PadParseBinding(const char *name, const char *key,
  uint32_t *bits, SDL_Scancode *code) {
  SDL_Scancode scancode;

  scancode = SDL_GetScancodeFromName(key);
  if (scancode == SDL_SCANCODE_UNKNOWN) { return -1; }
  if (PadFindButton(name, bits) == -1) { return -1; }
  *code = scancode;
  return 1;
}

/* look up a button by its controls file name: returns 1 and sets bits, or -1 */
int PadFindButton(const char *name, uint32_t *bits) {
  int i;

  for (i=0;i<PAD_BUTTON_COUNT;i++) {
    if (SDL_strcasecmp(name, pad_button_names[i].name) == 0) {
      *bits = pad_button_names[i].bits;
      return 1;
    }
  }
  return -1;
}

#define GAMEPAD_VALUE_PREFIX "pad:"

/* whether a binding's value is a controller's ("pad:a") rather than a key's */
int IsGamepadValue(const char *value) {
  return SDL_strncasecmp(value, GAMEPAD_VALUE_PREFIX, SDL_strlen(GAMEPAD_VALUE_PREFIX)) == 0;
}

static int TriggerControl(SDL_GameControllerAxis axis) {
  if (axis == SDL_CONTROLLER_AXIS_TRIGGERLEFT) { return GAMEPAD_LEFT_TRIGGER; }
  if (axis == SDL_CONTROLLER_AXIS_TRIGGERRIGHT) { return GAMEPAD_RIGHT_TRIGGER; }
  return -1;
}

/*
 * the controller control a binding's value names: "pad:" and SDL's name for
 * a button or trigger (e.g. "pad:a", "pad:dpup", "pad:lefttrigger").
 * returns the control (see pc/gamepad.h), or -1 if it doesn't name one
 */
int PadParseGamepadControl(const char *value) {
  SDL_GameControllerButton button;
  const char *name;

  if (!IsGamepadValue(value)) { return -1; }
  name = value + SDL_strlen(GAMEPAD_VALUE_PREFIX);
  if (!*name) { return -1; }
  button = SDL_GameControllerGetButtonFromString(name);
  if (button != SDL_CONTROLLER_BUTTON_INVALID) { return button; }
  return TriggerControl(SDL_GameControllerGetAxisFromString(name));
}

/* a controller control's name, without "pad:" (e.g. "a", "lefttrigger") */
const char *GamepadControlName(int control) {
  if (control == GAMEPAD_LEFT_TRIGGER) { return SDL_GameControllerGetStringForAxis(SDL_CONTROLLER_AXIS_TRIGGERLEFT); }
  if (control == GAMEPAD_RIGHT_TRIGGER) { return SDL_GameControllerGetStringForAxis(SDL_CONTROLLER_AXIS_TRIGGERRIGHT); }
  return SDL_GameControllerGetStringForButton(control);
}

/*
 * parse one line of a controls file, in the form "button = key name".
 * returns 1 and sets bits/code for a binding, 0 for a blank or
 * comment line, and -1 for an invalid line.
 */
int PadParseBindingLine(const char *line, uint32_t *bits, SDL_Scancode *code) {
  char buf[128], *name, *key;
  int res;

  res = ConfigParseLine(line, buf, sizeof(buf), &name, &key);
  if (res != 1) { return res; }
  return PadParseBinding(name, key, bits, code);
}
