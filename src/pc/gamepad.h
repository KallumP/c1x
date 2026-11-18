#ifndef _PC_GAMEPAD_H_
#define _PC_GAMEPAD_H_

#include <SDL2/SDL_gamecontroller.h>

/*
 * a game controller's controls: SDL's buttons, then the triggers, which SDL
 * reports as axes but play as buttons once pulled far enough
 */
#define GAMEPAD_LEFT_TRIGGER  SDL_CONTROLLER_BUTTON_MAX
#define GAMEPAD_RIGHT_TRIGGER (SDL_CONTROLLER_BUTTON_MAX + 1)
#define GAMEPAD_CONTROL_COUNT (SDL_CONTROLLER_BUTTON_MAX + 2)

void GamepadSetButton(int button, int down);
void GamepadSetAxis(int axis, int value);
void GamepadReleaseAll();
int GamepadIsHeld(int control);
int GamepadAxis(int axis);

#endif /* _PC_GAMEPAD_H_ */
