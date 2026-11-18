/*
 * game controllers: which buttons are held and where the sticks and triggers
 * are, from SDL's controller events (see pc/init.c). every connected
 * controller feeds the same state, so any of them plays as pad 1
 */
#include <string.h>
#include "pc/gamepad.h"

#define TRIGGER_HELD_FROM 16384 /* about halfway; a trigger axis runs 0 to 32767 */

static uint8_t buttons_held[SDL_CONTROLLER_BUTTON_MAX];
static int axes[SDL_CONTROLLER_AXIS_MAX];

static int IsButton(int button) {
  return button >= 0 && button < SDL_CONTROLLER_BUTTON_MAX;
}

static int IsAxis(int axis) {
  return axis >= 0 && axis < SDL_CONTROLLER_AXIS_MAX;
}

void GamepadSetButton(int button, int down) {
  if (!IsButton(button)) { return; }
  buttons_held[button] = down != 0;
}

void GamepadSetAxis(int axis, int value) {
  if (!IsAxis(axis)) { return; }
  axes[axis] = value;
}

/* let go of everything, e.g. when a controller is unplugged mid-press */
void GamepadReleaseAll() {
  memset(buttons_held, 0, sizeof(buttons_held));
  memset(axes, 0, sizeof(axes));
}

static int IsTriggerPulled(int axis) {
  return axes[axis] >= TRIGGER_HELD_FROM;
}

/* is a control (an SDL button or GAMEPAD_LEFT/RIGHT_TRIGGER) held? */
int GamepadIsHeld(int control) {
  if (IsButton(control)) { return buttons_held[control]; }
  if (control == GAMEPAD_LEFT_TRIGGER) { return IsTriggerPulled(SDL_CONTROLLER_AXIS_TRIGGERLEFT); }
  if (control == GAMEPAD_RIGHT_TRIGGER) { return IsTriggerPulled(SDL_CONTROLLER_AXIS_TRIGGERRIGHT); }
  return 0;
}

/* an axis's position, -32768 to 32767 (0 to 32767 for the triggers) */
int GamepadAxis(int axis) {
  if (!IsAxis(axis)) { return 0; }
  return axes[axis];
}
