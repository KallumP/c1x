#include <string.h>
#include <SDL2/SDL_scancode.h>
#include "utest.h"
#include "pc/pad.h"
#include "pc/gamepad.h"

/* key state normally filled in by src/pc/init.c, indexed by SDL scancode */
uint8_t keys[512];

/* SwPadRead's held buttons are its upper 16 bits */
#define HELD(buttons) ((uint32_t)(buttons) << 16)

static void press(SDL_Scancode code) {
  keys[code] = 1;
}

UTEST(pad, nothing_held_when_no_keys_pressed) {
  memset(keys, 0, sizeof(keys));
  GamepadReleaseAll();
  ASSERT_EQ(0u, SwPadRead(0));
}

UTEST(pad, space_presses_cross) {
  memset(keys, 0, sizeof(keys));
  press(SDL_SCANCODE_SPACE);
  ASSERT_EQ(HELD(PAD_CROSS), SwPadRead(0));
}

UTEST(pad, w_presses_up) {
  memset(keys, 0, sizeof(keys));
  press(SDL_SCANCODE_W);
  ASSERT_EQ(HELD(PAD_UP), SwPadRead(0));
}

UTEST(pad, held_buttons_combine) {
  memset(keys, 0, sizeof(keys));
  press(SDL_SCANCODE_SPACE);
  press(SDL_SCANCODE_A);
  press(SDL_SCANCODE_J);
  ASSERT_EQ(HELD(PAD_CROSS | PAD_LEFT | PAD_START), SwPadRead(0));
}

UTEST(pad, only_player_one_is_read) {
  memset(keys, 0, sizeof(keys));
  press(SDL_SCANCODE_SPACE);
  ASSERT_EQ(0u, SwPadRead(1));
}

UTEST(pad, a_controller_button_presses_its_button) {
  memset(keys, 0, sizeof(keys));
  GamepadReleaseAll();
  GamepadSetButton(SDL_CONTROLLER_BUTTON_A, 1);
  ASSERT_EQ(HELD(PAD_CROSS), SwPadRead(0));
  GamepadReleaseAll();
}

UTEST(pad, keys_and_controller_buttons_combine) {
  memset(keys, 0, sizeof(keys));
  GamepadReleaseAll();
  press(SDL_SCANCODE_SPACE);
  GamepadSetButton(SDL_CONTROLLER_BUTTON_DPAD_LEFT, 1);
  ASSERT_EQ(HELD(PAD_CROSS | PAD_LEFT), SwPadRead(0));
  GamepadReleaseAll();
}

UTEST(pad, a_controller_only_plays_player_one) {
  memset(keys, 0, sizeof(keys));
  GamepadReleaseAll();
  GamepadSetButton(SDL_CONTROLLER_BUTTON_A, 1);
  ASSERT_EQ(0u, SwPadRead(1));
  GamepadReleaseAll();
}
