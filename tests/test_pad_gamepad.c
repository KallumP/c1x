#include <string.h>
#include "utest.h"
#include <SDL2/SDL.h>
#include "pc/pad.h"
#include "pc/gamepad.h"
#include "test_files.h"

extern uint8_t keys[512]; /* defined in test_pad.c */

/* the buttons held while only the given controller control is held */
static uint32_t held_for_control(int control) {
  GamepadReleaseAll();
  if (control == GAMEPAD_LEFT_TRIGGER) { GamepadSetAxis(0, SDL_CONTROLLER_AXIS_TRIGGERLEFT, 32767); }
  else if (control == GAMEPAD_RIGHT_TRIGGER) { GamepadSetAxis(0, SDL_CONTROLLER_AXIS_TRIGGERRIGHT, 32767); }
  else { GamepadSetButton(0, control, 1); }
  return PadGamepadHeld(0);
}

/* face buttons by position, as on a PlayStation pad: bottom is cross */
UTEST(pad_gamepad, the_default_layout_matches_a_playstation_pad) {
  static const struct { int control; uint32_t buttons; } layout[] = {
    { SDL_CONTROLLER_BUTTON_A, PAD_CROSS }, { SDL_CONTROLLER_BUTTON_B, PAD_CIRCLE },
    { SDL_CONTROLLER_BUTTON_X, PAD_SQUARE }, { SDL_CONTROLLER_BUTTON_Y, PAD_TRIANGLE },
    { SDL_CONTROLLER_BUTTON_LEFTSHOULDER, PAD_L1 }, { SDL_CONTROLLER_BUTTON_RIGHTSHOULDER, PAD_R1 },
    { GAMEPAD_LEFT_TRIGGER, PAD_L2 }, { GAMEPAD_RIGHT_TRIGGER, PAD_R2 },
    { SDL_CONTROLLER_BUTTON_LEFTSTICK, PAD_L3 }, { SDL_CONTROLLER_BUTTON_RIGHTSTICK, PAD_R3 },
    { SDL_CONTROLLER_BUTTON_START, PAD_START }, { SDL_CONTROLLER_BUTTON_BACK, PAD_SELECT },
    { SDL_CONTROLLER_BUTTON_DPAD_UP, PAD_UP }, { SDL_CONTROLLER_BUTTON_DPAD_DOWN, PAD_DOWN },
    { SDL_CONTROLLER_BUTTON_DPAD_LEFT, PAD_LEFT }, { SDL_CONTROLLER_BUTTON_DPAD_RIGHT, PAD_RIGHT },
  };
  size_t i;

  PadResetBindings();
  for (i = 0; i < sizeof(layout) / sizeof(layout[0]); i++) {
    EXPECT_EQ(layout[i].buttons, held_for_control(layout[i].control));
  }
  GamepadReleaseAll();
}

UTEST(pad_gamepad, nothing_held_when_the_controller_is_untouched) {
  PadResetBindings();
  GamepadReleaseAll();
  ASSERT_EQ(0u, PadGamepadHeld(0));
}

UTEST(pad_gamepad, held_controller_buttons_combine) {
  PadResetBindings();
  GamepadReleaseAll();
  GamepadSetButton(0, SDL_CONTROLLER_BUTTON_A, 1);
  GamepadSetButton(0, SDL_CONTROLLER_BUTTON_DPAD_LEFT, 1);
  ASSERT_EQ((uint32_t)(PAD_CROSS | PAD_LEFT), PadGamepadHeld(0));
  GamepadReleaseAll();
}

/* the buttons held with the left stick at x, y (SDL's y is down) */
static uint32_t held_for_stick(int x, int y) {
  GamepadReleaseAll();
  GamepadSetAxis(0, SDL_CONTROLLER_AXIS_LEFTX, x);
  GamepadSetAxis(0, SDL_CONTROLLER_AXIS_LEFTY, y);
  return PadGamepadHeld(0);
}

UTEST(pad_gamepad, the_left_stick_pushed_far_presses_its_direction) {
  PadResetBindings();
  EXPECT_EQ((uint32_t)PAD_LEFT, held_for_stick(-32768, 0));
  EXPECT_EQ((uint32_t)PAD_RIGHT, held_for_stick(32767, 0));
  EXPECT_EQ((uint32_t)PAD_UP, held_for_stick(0, -32768));
  EXPECT_EQ((uint32_t)PAD_DOWN, held_for_stick(0, 32767));
  GamepadReleaseAll();
}

UTEST(pad_gamepad, the_left_stick_barely_pushed_presses_nothing) {
  PadResetBindings();
  EXPECT_EQ(0u, held_for_stick(8000, -8000));
  GamepadReleaseAll();
}

UTEST(pad_gamepad, the_left_stick_pushed_diagonally_presses_both_directions) {
  PadResetBindings();
  EXPECT_EQ((uint32_t)(PAD_UP | PAD_RIGHT), held_for_stick(23000, -23000));
  GamepadReleaseAll();
}

UTEST(pad_gamepad, the_right_stick_presses_nothing) {
  PadResetBindings();
  GamepadReleaseAll();
  GamepadSetAxis(0, SDL_CONTROLLER_AXIS_RIGHTX, 32767);
  EXPECT_EQ(0u, PadGamepadHeld(0));
  GamepadReleaseAll();
}

#define GAMEPAD_CONFIG_PATH "build/test_gamepad_controls.cfg"

/* load the controls file text, over the defaults */
static int load_controls(const char *text) {
  PadResetBindings();
  WriteWholeFile(GAMEPAD_CONFIG_PATH, text);
  return PadLoadBindings(GAMEPAD_CONFIG_PATH);
}

UTEST(pad_gamepad, a_pad_line_replaces_the_buttons_default_controller_button) {
  ASSERT_EQ(1, load_controls("cross = pad:guide\n"));
  EXPECT_EQ((uint32_t)PAD_CROSS, held_for_control(SDL_CONTROLLER_BUTTON_GUIDE));
  EXPECT_EQ(0u, held_for_control(SDL_CONTROLLER_BUTTON_A));
  GamepadReleaseAll();
}

UTEST(pad_gamepad, a_pad_line_keeps_the_buttons_keys) {
  ASSERT_EQ(1, load_controls("cross = pad:b\n"));
  memset(keys, 0, sizeof(keys));
  keys[SDL_SCANCODE_SPACE] = 1;
  GamepadReleaseAll();
  EXPECT_EQ((uint32_t)PAD_CROSS << 16, SwPadRead(0));
  keys[SDL_SCANCODE_SPACE] = 0;
}

UTEST(pad_gamepad, a_key_line_keeps_the_buttons_controller_button) {
  ASSERT_EQ(1, load_controls("cross = V\n"));
  EXPECT_EQ((uint32_t)PAD_CROSS, held_for_control(SDL_CONTROLLER_BUTTON_A));
  GamepadReleaseAll();
}

UTEST(pad_gamepad, repeated_pad_lines_add_controller_buttons) {
  ASSERT_EQ(2, load_controls("cross = pad:a\ncross = pad:righttrigger\n"));
  EXPECT_EQ((uint32_t)PAD_CROSS, held_for_control(SDL_CONTROLLER_BUTTON_A));
  EXPECT_EQ((uint32_t)(PAD_CROSS | PAD_R2), held_for_control(GAMEPAD_RIGHT_TRIGGER));
  GamepadReleaseAll();
}

UTEST(pad_gamepad, an_unknown_controller_button_line_is_skipped) {
  ASSERT_EQ(0, load_controls("cross = pad:banana\n"));
  EXPECT_EQ((uint32_t)PAD_CROSS, held_for_control(SDL_CONTROLLER_BUTTON_A));
  GamepadReleaseAll();
}

UTEST(pad_gamepad, reset_restores_the_default_controller_layout) {
  load_controls("cross = pad:b\n");
  PadResetBindings();
  EXPECT_EQ((uint32_t)PAD_CROSS, held_for_control(SDL_CONTROLLER_BUTTON_A));
  EXPECT_EQ((uint32_t)PAD_CIRCLE, held_for_control(SDL_CONTROLLER_BUTTON_B));
  GamepadReleaseAll();
}

UTEST(pad_gamepad, controller_two_plays_the_same_layout) {
  PadResetBindings();
  GamepadReleaseAll();
  GamepadSetButton(1, SDL_CONTROLLER_BUTTON_A, 1);
  ASSERT_EQ((uint32_t)PAD_CROSS, PadGamepadHeld(1));
  GamepadReleaseAll();
}

UTEST(pad_gamepad, controller_two_buttons_arent_controller_one_buttons) {
  PadResetBindings();
  GamepadReleaseAll();
  GamepadSetButton(1, SDL_CONTROLLER_BUTTON_A, 1);
  ASSERT_EQ(0u, PadGamepadHeld(0));
  GamepadReleaseAll();
}

UTEST(pad_gamepad, controller_two_left_stick_moves_only_controller_two) {
  PadResetBindings();
  GamepadReleaseAll();
  GamepadSetAxis(1, SDL_CONTROLLER_AXIS_LEFTX, -32768);
  ASSERT_EQ(0u, PadGamepadHeld(0));
  GamepadReleaseAll();
}
