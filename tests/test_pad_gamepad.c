#include "utest.h"
#include <SDL2/SDL.h>
#include "pc/pad.h"
#include "pc/gamepad.h"

/* the buttons held while only the given controller control is held */
static uint32_t held_for_control(int control) {
  GamepadReleaseAll();
  if (control == GAMEPAD_LEFT_TRIGGER) { GamepadSetAxis(SDL_CONTROLLER_AXIS_TRIGGERLEFT, 32767); }
  else if (control == GAMEPAD_RIGHT_TRIGGER) { GamepadSetAxis(SDL_CONTROLLER_AXIS_TRIGGERRIGHT, 32767); }
  else { GamepadSetButton(control, 1); }
  return PadGamepadHeld();
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
  ASSERT_EQ(0u, PadGamepadHeld());
}

UTEST(pad_gamepad, held_controller_buttons_combine) {
  PadResetBindings();
  GamepadReleaseAll();
  GamepadSetButton(SDL_CONTROLLER_BUTTON_A, 1);
  GamepadSetButton(SDL_CONTROLLER_BUTTON_DPAD_LEFT, 1);
  ASSERT_EQ((uint32_t)(PAD_CROSS | PAD_LEFT), PadGamepadHeld());
  GamepadReleaseAll();
}

/* the buttons held with the left stick at x, y (SDL's y is down) */
static uint32_t held_for_stick(int x, int y) {
  GamepadReleaseAll();
  GamepadSetAxis(SDL_CONTROLLER_AXIS_LEFTX, x);
  GamepadSetAxis(SDL_CONTROLLER_AXIS_LEFTY, y);
  return PadGamepadHeld();
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
  GamepadSetAxis(SDL_CONTROLLER_AXIS_RIGHTX, 32767);
  EXPECT_EQ(0u, PadGamepadHeld());
  GamepadReleaseAll();
}
