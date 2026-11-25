/*
 * game controllers: which buttons are held and where the sticks and triggers
 * are on each, from SDL's controller events (see pc/init.c). controllers are
 * numbered in the order they're plugged in: controller 1 (0) plays pad 1,
 * controller 2 (1) pad 2
 */
#include <string.h>
#include "pc/gamepad.h"

#define TRIGGER_HELD_FROM 16384 /* about halfway; a trigger axis runs 0 to 32767 */
#define NO_CONTROLLER_ID  -1    /* SDL instance ids start at 0 */

typedef struct {
  int id; /* SDL's instance id for the plugged in controller */
  uint8_t buttons_held[SDL_CONTROLLER_BUTTON_MAX];
  int axes[SDL_CONTROLLER_AXIS_MAX];
} gamepad;

static gamepad gamepads[GAMEPAD_COUNT] = {
  { .id = NO_CONTROLLER_ID },
  { .id = NO_CONTROLLER_ID },
};

static int IsGamepad(int gamepad_idx) {
  return gamepad_idx >= 0 && gamepad_idx < GAMEPAD_COUNT;
}

static int IsButton(int button) {
  return button >= 0 && button < SDL_CONTROLLER_BUTTON_MAX;
}

static int IsAxis(int axis) {
  return axis >= 0 && axis < SDL_CONTROLLER_AXIS_MAX;
}

/* the controller plugged in as id, or GAMEPAD_NONE */
int GamepadFind(int id) {
  int idx;

  for (idx=0;idx<GAMEPAD_COUNT;idx++) {
    if (gamepads[idx].id == id) { return idx; }
  }
  return GAMEPAD_NONE;
}

/* the controller a newly plugged in id plays as: the first free one, or GAMEPAD_NONE */
int GamepadConnect(int id) {
  int idx;

  idx = GamepadFind(NO_CONTROLLER_ID);
  if (idx == GAMEPAD_NONE) { return GAMEPAD_NONE; }
  gamepads[idx].id = id;
  return idx;
}

static void GamepadRelease(int gamepad_idx) {
  memset(gamepads[gamepad_idx].buttons_held, 0, sizeof(gamepads[gamepad_idx].buttons_held));
  memset(gamepads[gamepad_idx].axes, 0, sizeof(gamepads[gamepad_idx].axes));
}

/* let go of an unplugged controller, so nothing stays held from it mid-press */
void GamepadDisconnect(int id) {
  int idx;

  idx = GamepadFind(id);
  if (idx == GAMEPAD_NONE) { return; }
  GamepadRelease(idx);
  gamepads[idx].id = NO_CONTROLLER_ID;
}

void GamepadReleaseAll() {
  int idx;

  for (idx=0;idx<GAMEPAD_COUNT;idx++)
    GamepadRelease(idx);
}

void GamepadSetButton(int gamepad_idx, int button, int down) {
  if (!IsGamepad(gamepad_idx) || !IsButton(button)) { return; }
  gamepads[gamepad_idx].buttons_held[button] = down != 0;
}

void GamepadSetAxis(int gamepad_idx, int axis, int value) {
  if (!IsGamepad(gamepad_idx) || !IsAxis(axis)) { return; }
  gamepads[gamepad_idx].axes[axis] = value;
}

static int IsTriggerPulled(int gamepad_idx, int axis) {
  return gamepads[gamepad_idx].axes[axis] >= TRIGGER_HELD_FROM;
}

/* the trigger control (GAMEPAD_LEFT/RIGHT_TRIGGER) an axis at value pulls, or -1 if it doesn't pull one */
int GamepadPulledTrigger(int axis, int value) {
  if (value < TRIGGER_HELD_FROM) { return -1; }
  if (axis == SDL_CONTROLLER_AXIS_TRIGGERLEFT) { return GAMEPAD_LEFT_TRIGGER; }
  if (axis == SDL_CONTROLLER_AXIS_TRIGGERRIGHT) { return GAMEPAD_RIGHT_TRIGGER; }
  return -1;
}

/* is a control (an SDL button or GAMEPAD_LEFT/RIGHT_TRIGGER) held? */
int GamepadIsHeld(int gamepad_idx, int control) {
  if (!IsGamepad(gamepad_idx)) { return 0; }
  if (IsButton(control)) { return gamepads[gamepad_idx].buttons_held[control]; }
  if (control == GAMEPAD_LEFT_TRIGGER)
    return IsTriggerPulled(gamepad_idx, SDL_CONTROLLER_AXIS_TRIGGERLEFT);
  if (control == GAMEPAD_RIGHT_TRIGGER)
    return IsTriggerPulled(gamepad_idx, SDL_CONTROLLER_AXIS_TRIGGERRIGHT);
  return 0;
}

/* an axis's position, -32768 to 32767 (0 to 32767 for the triggers) */
int GamepadAxis(int gamepad_idx, int axis) {
  if (!IsGamepad(gamepad_idx) || !IsAxis(axis)) { return 0; }
  return gamepads[gamepad_idx].axes[axis];
}
