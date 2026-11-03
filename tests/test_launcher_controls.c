#include "utest.h"
#include <SDL2/SDL.h>
#include "launcher/controls_file.h"

#define LAUNCHER_CONTROLS_PATH "build/test_launcher_controls.cfg"

static void WriteLauncherControls(const char *contents) {
  FILE *file;

  file = fopen(LAUNCHER_CONTROLS_PATH, "wb");
  fputs(contents, file);
  fclose(file);
}

UTEST(launcher_controls, every_button_has_its_default_key) {
  launcher_controls c;

  ResetControls(&c);
  ASSERT_EQ(1, c.key_count[FindPadButton("cross")]);
  ASSERT_EQ(SDL_SCANCODE_Z, c.keys[FindPadButton("cross")][0]);
  ASSERT_EQ(SDL_SCANCODE_RETURN, c.keys[FindPadButton("start")][0]);
}

UTEST(launcher_controls, an_unknown_button_isnt_found) {
  ASSERT_EQ(-1, FindPadButton("jump"));
}

UTEST(launcher_controls, uses_the_defaults_without_a_controls_file) {
  launcher_controls c, defaults;

  remove(LAUNCHER_CONTROLS_PATH);
  ASSERT_EQ(0, ReadControlsFile(LAUNCHER_CONTROLS_PATH, &c));
  ResetControls(&defaults);
  ASSERT_TRUE(AreControlsEqual(&defaults, &c));
}

UTEST(launcher_controls, a_buttons_lines_replace_its_default_key) {
  launcher_controls c;
  int cross;

  WriteLauncherControls("# my keys\ncross = Space\nsquare = X\ncross = K\n");
  ASSERT_EQ(1, ReadControlsFile(LAUNCHER_CONTROLS_PATH, &c));
  cross = FindPadButton("cross");
  ASSERT_EQ(2, c.key_count[cross]);
  ASSERT_EQ(SDL_SCANCODE_SPACE, c.keys[cross][0]);
  ASSERT_EQ(SDL_SCANCODE_K, c.keys[cross][1]);
  ASSERT_EQ(SDL_SCANCODE_RETURN, c.keys[FindPadButton("start")][0]);
}

UTEST(launcher_controls, skips_invalid_lines) {
  launcher_controls c;

  WriteLauncherControls("cross = Nope\njump = Z\ncross\n");
  ReadControlsFile(LAUNCHER_CONTROLS_PATH, &c);
  ASSERT_EQ(1, c.key_count[FindPadButton("cross")]);
  ASSERT_EQ(SDL_SCANCODE_Z, c.keys[FindPadButton("cross")][0]);
}

UTEST(launcher_controls, keeps_at_most_the_most_keys_a_button_can_have) {
  launcher_controls c;

  WriteLauncherControls("cross = A\ncross = B\ncross = C\ncross = D\ncross = E\n");
  ReadControlsFile(LAUNCHER_CONTROLS_PATH, &c);
  ASSERT_EQ(BUTTON_KEYS_MAX, c.key_count[FindPadButton("cross")]);
}

UTEST(launcher_controls, controls_with_a_different_key_arent_equal) {
  launcher_controls a, b;

  ResetControls(&a);
  ResetControls(&b);
  ASSERT_TRUE(AreControlsEqual(&a, &b));
  b.keys[FindPadButton("cross")][0] = SDL_SCANCODE_K;
  ASSERT_FALSE(AreControlsEqual(&a, &b));
}
