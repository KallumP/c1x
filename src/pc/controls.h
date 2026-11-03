#ifndef _PC_CONTROLS_H_
#define _PC_CONTROLS_H_

#include <SDL2/SDL_scancode.h>
#include "pc/pad.h"

#define PAD_BUTTON_COUNT 16

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

extern const sw_pad_mapping pad_default_mappings[PAD_BUTTON_COUNT];
extern const pad_button_name pad_button_names[PAD_BUTTON_COUNT];

int PadParseBinding(const char *name, const char *key, uint32_t *bits, SDL_Scancode *code);
int PadParseBindingLine(const char *line, uint32_t *bits, SDL_Scancode *code);

#endif /* _PC_CONTROLS_H_ */
