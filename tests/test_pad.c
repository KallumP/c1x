#include <string.h>
#include <SDL2/SDL_scancode.h>
#include "utest.h"
#include "pc/pad.h"

/* key state normally filled in by src/pc/init.c, indexed by SDL scancode */
uint8_t keys[512];

/* SwPadRead's held buttons are its upper 16 bits */
#define HELD(buttons) ((uint32_t)(buttons) << 16)

static void press(SDL_Scancode code) {
  keys[code] = 1;
}

UTEST(pad, nothing_held_when_no_keys_pressed) {
  memset(keys, 0, sizeof(keys));
  ASSERT_EQ(0u, SwPadRead(0));
}

UTEST(pad, z_presses_cross) {
  memset(keys, 0, sizeof(keys));
  press(SDL_SCANCODE_Z);
  ASSERT_EQ(HELD(PAD_CROSS), SwPadRead(0));
}

UTEST(pad, up_arrow_presses_up) {
  memset(keys, 0, sizeof(keys));
  press(SDL_SCANCODE_UP);
  ASSERT_EQ(HELD(PAD_UP), SwPadRead(0));
}

UTEST(pad, held_buttons_combine) {
  memset(keys, 0, sizeof(keys));
  press(SDL_SCANCODE_Z);
  press(SDL_SCANCODE_LEFT);
  press(SDL_SCANCODE_RETURN);
  ASSERT_EQ(HELD(PAD_CROSS | PAD_LEFT | PAD_START), SwPadRead(0));
}

UTEST(pad, only_player_one_is_read) {
  memset(keys, 0, sizeof(keys));
  press(SDL_SCANCODE_Z);
  ASSERT_EQ(0u, SwPadRead(1));
}
