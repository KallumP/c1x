/*
 * controls files (controls.cfg): the buttons' names, their default keys, and
 * reading a binding line. shared by the game (pad.c) and the launcher
 */
#include <SDL2/SDL.h>
#include "pc/controls.h"
#include "pc/config.h"

const sw_pad_mapping pad_default_mappings[PAD_BUTTON_COUNT] = {
  { .code = SDL_SCANCODE_SPACE,  .bits = PAD_SELECT   },
  { .code = SDL_SCANCODE_1,      .bits = PAD_L3       },
  { .code = SDL_SCANCODE_3,      .bits = PAD_R3       },
  { .code = SDL_SCANCODE_RETURN, .bits = PAD_START    },
  { .code = SDL_SCANCODE_UP,     .bits = PAD_UP       },
  { .code = SDL_SCANCODE_RIGHT,  .bits = PAD_RIGHT    },
  { .code = SDL_SCANCODE_DOWN,   .bits = PAD_DOWN     },
  { .code = SDL_SCANCODE_LEFT,   .bits = PAD_LEFT     },
  { .code = SDL_SCANCODE_Q,      .bits = PAD_L2       },
  { .code = SDL_SCANCODE_E,      .bits = PAD_R2       },
  { .code = SDL_SCANCODE_A,      .bits = PAD_L1       },
  { .code = SDL_SCANCODE_D,      .bits = PAD_R1       },
  { .code = SDL_SCANCODE_S,      .bits = PAD_TRIANGLE },
  { .code = SDL_SCANCODE_C,      .bits = PAD_CIRCLE   },
  { .code = SDL_SCANCODE_Z,      .bits = PAD_CROSS    },
  { .code = SDL_SCANCODE_X,      .bits = PAD_SQUARE   },
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
  int i, count;

  scancode = SDL_GetScancodeFromName(key);
  if (scancode == SDL_SCANCODE_UNKNOWN) { return -1; }
  count = sizeof(pad_button_names)/sizeof(pad_button_names[0]);
  for (i=0;i<count;i++) {
    if (SDL_strcasecmp(name, pad_button_names[i].name) == 0) {
      *bits = pad_button_names[i].bits;
      *code = scancode;
      return 1;
    }
  }
  return -1;
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
