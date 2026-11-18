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
