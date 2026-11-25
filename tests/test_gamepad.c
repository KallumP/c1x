#include "utest.h"
#include <SDL2/SDL.h>
#include "pc/gamepad.h"

#define FIRST_ID  7  /* SDL instance ids: any numbers, not the controller numbers */
#define SECOND_ID 12
#define THIRD_ID  20

static void UnplugAll() {
  GamepadDisconnect(FIRST_ID);
  GamepadDisconnect(SECOND_ID);
  GamepadDisconnect(THIRD_ID);
  GamepadReleaseAll();
}

UTEST(gamepad, a_pressed_button_is_held) {
  GamepadReleaseAll();
  GamepadSetButton(0, SDL_CONTROLLER_BUTTON_A, 1);
  ASSERT_TRUE(GamepadIsHeld(0, SDL_CONTROLLER_BUTTON_A));
  ASSERT_FALSE(GamepadIsHeld(0, SDL_CONTROLLER_BUTTON_B));
}

UTEST(gamepad, a_let_go_button_isnt_held) {
  GamepadReleaseAll();
  GamepadSetButton(0, SDL_CONTROLLER_BUTTON_A, 1);
  GamepadSetButton(0, SDL_CONTROLLER_BUTTON_A, 0);
  ASSERT_FALSE(GamepadIsHeld(0, SDL_CONTROLLER_BUTTON_A));
}

UTEST(gamepad, a_button_held_on_one_controller_isnt_held_on_the_other) {
  GamepadReleaseAll();
  GamepadSetButton(1, SDL_CONTROLLER_BUTTON_A, 1);
  ASSERT_FALSE(GamepadIsHeld(0, SDL_CONTROLLER_BUTTON_A));
}

UTEST(gamepad, a_trigger_pulled_past_halfway_is_held) {
  GamepadReleaseAll();
  GamepadSetAxis(0, SDL_CONTROLLER_AXIS_TRIGGERLEFT, 20000);
  ASSERT_TRUE(GamepadIsHeld(0, GAMEPAD_LEFT_TRIGGER));
  ASSERT_FALSE(GamepadIsHeld(0, GAMEPAD_RIGHT_TRIGGER));
}

UTEST(gamepad, a_lightly_pulled_trigger_isnt_held) {
  GamepadReleaseAll();
  GamepadSetAxis(0, SDL_CONTROLLER_AXIS_TRIGGERRIGHT, 5000);
  ASSERT_FALSE(GamepadIsHeld(0, GAMEPAD_RIGHT_TRIGGER));
}

UTEST(gamepad, stick_positions_are_kept) {
  GamepadReleaseAll();
  GamepadSetAxis(0, SDL_CONTROLLER_AXIS_LEFTX, -12345);
  ASSERT_EQ(-12345, GamepadAxis(0, SDL_CONTROLLER_AXIS_LEFTX));
}

UTEST(gamepad, a_stick_moved_on_one_controller_stays_still_on_the_other) {
  GamepadReleaseAll();
  GamepadSetAxis(1, SDL_CONTROLLER_AXIS_LEFTX, -12345);
  ASSERT_EQ(0, GamepadAxis(0, SDL_CONTROLLER_AXIS_LEFTX));
}

UTEST(gamepad, releasing_all_lets_go_of_everything) {
  GamepadSetButton(1, SDL_CONTROLLER_BUTTON_START, 1);
  GamepadSetAxis(1, SDL_CONTROLLER_AXIS_LEFTY, 30000);
  GamepadReleaseAll();
  ASSERT_FALSE(GamepadIsHeld(1, SDL_CONTROLLER_BUTTON_START));
  ASSERT_EQ(0, GamepadAxis(1, SDL_CONTROLLER_AXIS_LEFTY));
}

UTEST(gamepad, unknown_controls_are_never_held) {
  GamepadReleaseAll();
  GamepadSetButton(0, -1, 1);
  GamepadSetButton(0, GAMEPAD_CONTROL_COUNT, 1);
  ASSERT_FALSE(GamepadIsHeld(0, -1));
  ASSERT_FALSE(GamepadIsHeld(0, GAMEPAD_CONTROL_COUNT));
}

UTEST(gamepad, an_unknown_controller_never_holds_anything) {
  GamepadReleaseAll();
  GamepadSetButton(GAMEPAD_COUNT, SDL_CONTROLLER_BUTTON_A, 1);
  ASSERT_FALSE(GamepadIsHeld(GAMEPAD_COUNT, SDL_CONTROLLER_BUTTON_A));
}

UTEST(gamepad, a_trigger_pulled_past_halfway_is_its_control) {
  ASSERT_EQ(GAMEPAD_LEFT_TRIGGER, GamepadPulledTrigger(SDL_CONTROLLER_AXIS_TRIGGERLEFT, 30000));
  ASSERT_EQ(GAMEPAD_RIGHT_TRIGGER, GamepadPulledTrigger(SDL_CONTROLLER_AXIS_TRIGGERRIGHT, 20000));
}

UTEST(gamepad, a_lightly_pulled_trigger_or_a_stick_is_no_control) {
  ASSERT_EQ(-1, GamepadPulledTrigger(SDL_CONTROLLER_AXIS_TRIGGERLEFT, 4000));
  ASSERT_EQ(-1, GamepadPulledTrigger(SDL_CONTROLLER_AXIS_LEFTX, 32767));
}

UTEST(gamepad, the_first_controller_plugged_in_is_controller_one) {
  UnplugAll();
  ASSERT_EQ(0, GamepadConnect(FIRST_ID));
}

UTEST(gamepad, the_second_controller_plugged_in_is_controller_two) {
  UnplugAll();
  GamepadConnect(FIRST_ID);
  ASSERT_EQ(1, GamepadConnect(SECOND_ID));
}

UTEST(gamepad, a_third_controller_plugged_in_plays_as_no_one) {
  UnplugAll();
  GamepadConnect(FIRST_ID);
  GamepadConnect(SECOND_ID);
  ASSERT_EQ(GAMEPAD_NONE, GamepadConnect(THIRD_ID));
}

UTEST(gamepad, a_connected_controller_is_found_by_its_id) {
  UnplugAll();
  GamepadConnect(FIRST_ID);
  GamepadConnect(SECOND_ID);
  ASSERT_EQ(1, GamepadFind(SECOND_ID));
}

UTEST(gamepad, an_unplugged_controller_is_not_found) {
  UnplugAll();
  GamepadConnect(FIRST_ID);
  GamepadDisconnect(FIRST_ID);
  ASSERT_EQ(GAMEPAD_NONE, GamepadFind(FIRST_ID));
}

UTEST(gamepad, a_controller_plugged_in_after_one_is_unplugged_takes_its_place) {
  UnplugAll();
  GamepadConnect(FIRST_ID);
  GamepadConnect(SECOND_ID);
  GamepadDisconnect(FIRST_ID);
  ASSERT_EQ(0, GamepadConnect(THIRD_ID));
}

UTEST(gamepad, unplugging_a_controller_lets_go_of_its_buttons) {
  UnplugAll();
  GamepadConnect(FIRST_ID);
  GamepadSetButton(0, SDL_CONTROLLER_BUTTON_A, 1);
  GamepadDisconnect(FIRST_ID);
  ASSERT_FALSE(GamepadIsHeld(0, SDL_CONTROLLER_BUTTON_A));
}

UTEST(gamepad, unplugging_a_controller_leaves_the_other_held) {
  UnplugAll();
  GamepadConnect(FIRST_ID);
  GamepadConnect(SECOND_ID);
  GamepadSetButton(1, SDL_CONTROLLER_BUTTON_A, 1);
  GamepadDisconnect(FIRST_ID);
  ASSERT_TRUE(GamepadIsHeld(1, SDL_CONTROLLER_BUTTON_A));
}

UTEST(gamepad, a_controller_connected_twice_keeps_its_place) {
  UnplugAll();
  GamepadConnect(FIRST_ID);
  ASSERT_EQ(0, GamepadConnect(FIRST_ID));
}
