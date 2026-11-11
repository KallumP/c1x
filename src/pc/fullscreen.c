/*
 * switching between fullscreen and a window while playing, with alt+enter
 * as in most windows games
 */
#include "fullscreen.h"

static int IsEnter(SDL_Scancode key) {
  return key == SDL_SCANCODE_RETURN || key == SDL_SCANCODE_KP_ENTER;
}

int IsFullscreenToggle(SDL_Scancode key, Uint16 mod) {
  return IsEnter(key) && (mod & KMOD_ALT) != 0;
}
