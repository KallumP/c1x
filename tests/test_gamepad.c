#include "utest.h"
#include <SDL2/SDL.h>
#include "pc/gamepad.h"

UTEST(gamepad, a_pressed_button_is_held) {
  GamepadReleaseAll();
  GamepadSetButton(SDL_CONTROLLER_BUTTON_A, 1);
  ASSERT_TRUE(GamepadIsHeld(SDL_CONTROLLER_BUTTON_A));
  ASSERT_FALSE(GamepadIsHeld(SDL_CONTROLLER_BUTTON_B));
}

UTEST(gamepad, a_let_go_button_isnt_held) {
  GamepadReleaseAll();
  GamepadSetButton(SDL_CONTROLLER_BUTTON_A, 1);
  GamepadSetButton(SDL_CONTROLLER_BUTTON_A, 0);
  ASSERT_FALSE(GamepadIsHeld(SDL_CONTROLLER_BUTTON_A));
}

UTEST(gamepad, a_trigger_pulled_past_halfway_is_held) {
  GamepadReleaseAll();
  GamepadSetAxis(SDL_CONTROLLER_AXIS_TRIGGERLEFT, 20000);
  ASSERT_TRUE(GamepadIsHeld(GAMEPAD_LEFT_TRIGGER));
  ASSERT_FALSE(GamepadIsHeld(GAMEPAD_RIGHT_TRIGGER));
}

UTEST(gamepad, a_lightly_pulled_trigger_isnt_held) {
  GamepadReleaseAll();
  GamepadSetAxis(SDL_CONTROLLER_AXIS_TRIGGERRIGHT, 5000);
  ASSERT_FALSE(GamepadIsHeld(GAMEPAD_RIGHT_TRIGGER));
}

UTEST(gamepad, stick_positions_are_kept) {
  GamepadReleaseAll();
  GamepadSetAxis(SDL_CONTROLLER_AXIS_LEFTX, -12345);
  ASSERT_EQ(-12345, GamepadAxis(SDL_CONTROLLER_AXIS_LEFTX));
}

UTEST(gamepad, releasing_all_lets_go_of_everything) {
  GamepadSetButton(SDL_CONTROLLER_BUTTON_START, 1);
  GamepadSetAxis(SDL_CONTROLLER_AXIS_LEFTY, 30000);
  GamepadReleaseAll();
  ASSERT_FALSE(GamepadIsHeld(SDL_CONTROLLER_BUTTON_START));
  ASSERT_EQ(0, GamepadAxis(SDL_CONTROLLER_AXIS_LEFTY));
}

UTEST(gamepad, unknown_controls_are_never_held) {
  GamepadReleaseAll();
  GamepadSetButton(-1, 1);
  GamepadSetButton(GAMEPAD_CONTROL_COUNT, 1);
  ASSERT_FALSE(GamepadIsHeld(-1));
  ASSERT_FALSE(GamepadIsHeld(GAMEPAD_CONTROL_COUNT));
}
