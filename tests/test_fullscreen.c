#include <SDL2/SDL.h>
#include "utest.h"
#include "pc/fullscreen.h"

UTEST(fullscreen, alt_enter_toggles_fullscreen) {
  ASSERT_TRUE(IsFullscreenToggle(SDL_SCANCODE_RETURN, KMOD_LALT));
  ASSERT_TRUE(IsFullscreenToggle(SDL_SCANCODE_RETURN, KMOD_RALT));
  ASSERT_TRUE(IsFullscreenToggle(SDL_SCANCODE_KP_ENTER, KMOD_LALT));
}

UTEST(fullscreen, enter_on_its_own_doesnt_toggle) {
  ASSERT_FALSE(IsFullscreenToggle(SDL_SCANCODE_RETURN, KMOD_NONE));
  ASSERT_FALSE(IsFullscreenToggle(SDL_SCANCODE_RETURN, KMOD_LSHIFT));
}

UTEST(fullscreen, alt_with_another_key_doesnt_toggle) {
  ASSERT_FALSE(IsFullscreenToggle(SDL_SCANCODE_Z, KMOD_LALT));
}

UTEST(fullscreen, caps_lock_doesnt_stop_alt_enter) {
  ASSERT_TRUE(IsFullscreenToggle(SDL_SCANCODE_RETURN, KMOD_LALT | KMOD_CAPS | KMOD_NUM));
}

UTEST(fullscreen, f11_toggles_fullscreen_on_its_own_or_with_a_modifier) {
  ASSERT_TRUE(IsFullscreenToggle(SDL_SCANCODE_F11, KMOD_NONE));
  ASSERT_TRUE(IsFullscreenToggle(SDL_SCANCODE_F11, KMOD_LSHIFT | KMOD_CAPS));
}

UTEST(fullscreen, other_function_keys_dont_toggle) {
  ASSERT_FALSE(IsFullscreenToggle(SDL_SCANCODE_F10, KMOD_NONE));
  ASSERT_FALSE(IsFullscreenToggle(SDL_SCANCODE_F12, KMOD_NONE));
}
