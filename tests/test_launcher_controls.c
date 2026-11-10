#include "utest.h"
#include <SDL2/SDL.h>
#include "launcher/controls_file.h"
#include "test_files.h"

#define LAUNCHER_CONTROLS_PATH "build/test_launcher_controls.cfg"

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

  WriteWholeFile(LAUNCHER_CONTROLS_PATH, "# my keys\ncross = Space\nsquare = X\ncross = K\n");
  ASSERT_EQ(1, ReadControlsFile(LAUNCHER_CONTROLS_PATH, &c));
  cross = FindPadButton("cross");
  ASSERT_EQ(2, c.key_count[cross]);
  ASSERT_EQ(SDL_SCANCODE_SPACE, c.keys[cross][0]);
  ASSERT_EQ(SDL_SCANCODE_K, c.keys[cross][1]);
  ASSERT_EQ(SDL_SCANCODE_RETURN, c.keys[FindPadButton("start")][0]);
}

UTEST(launcher_controls, keeps_at_most_the_most_keys_a_button_can_have) {
  launcher_controls c;

  WriteWholeFile(LAUNCHER_CONTROLS_PATH, "cross = A\ncross = B\ncross = C\ncross = D\ncross = E\n");
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

/* SetButtonLines' result for text, compared with expected, then freed */
static int SetButtonGives(const char *text, const char *name, const SDL_Scancode *keys,
  int count, const char *expected) {
  char *result;
  int same;

  result = SetButtonLines(text, name, keys, count);
  same = strcmp(result, expected) == 0;
  if (!same) { printf("got:\n%s\nexpected:\n%s\n", result, expected); }
  SDL_free(result);
  return same;
}

UTEST(launcher_controls, set_changes_a_buttons_line_keeping_its_spacing) {
  SDL_Scancode keys[] = { SDL_SCANCODE_SPACE };

  ASSERT_TRUE(SetButtonGives("# keys\ncross    = Z\nsquare   = X\n", "cross", keys, 1,
    "# keys\ncross    = Space\nsquare   = X\n"));
}

UTEST(launcher_controls, set_gives_a_line_per_key) {
  SDL_Scancode keys[] = { SDL_SCANCODE_Z, SDL_SCANCODE_K };

  ASSERT_TRUE(SetButtonGives("cross = Z\nsquare = X\n", "cross", keys, 2,
    "cross = Z\ncross = K\nsquare = X\n"));
}

UTEST(launcher_controls, set_removes_the_buttons_other_lines) {
  SDL_Scancode keys[] = { SDL_SCANCODE_Z };

  ASSERT_TRUE(SetButtonGives("cross = Z\nsquare = X\ncross = K\n# cross = J\n", "cross", keys, 1,
    "cross = Z\nsquare = X\n# cross = J\n"));
}

UTEST(launcher_controls, set_adds_lines_for_a_button_not_in_the_file) {
  SDL_Scancode keys[] = { SDL_SCANCODE_Z };

  ASSERT_TRUE(SetButtonGives("square = X", "cross", keys, 1,
    "square = X\ncross = Z\n"));
}

UTEST(launcher_controls, set_leaves_a_button_already_set_to_its_keys) {
  SDL_Scancode keys[] = { SDL_SCANCODE_Z };

  ASSERT_TRUE(SetButtonGives("cross=z\r\n", "cross", keys, 1, "cross=z\r\n"));
}

UTEST(launcher_controls, set_keeps_windows_line_endings) {
  SDL_Scancode keys[] = { SDL_SCANCODE_RETURN, SDL_SCANCODE_KP_ENTER };

  ASSERT_TRUE(SetButtonGives("start = Space\r\nselect = Tab\r\n", "start", keys, 2,
    "start = Return\r\nstart = Keypad Enter\r\nselect = Tab\r\n"));
}

#define LAUNCHER_CONTROLS_EXAMPLE_PATH "build/test_launcher_controls.example.cfg"

UTEST(launcher_controls, saved_controls_read_back_the_same) {
  launcher_controls c, read;
  int cross;

  remove(LAUNCHER_CONTROLS_PATH);
  ResetControls(&c);
  cross = FindPadButton("cross");
  c.keys[cross][0] = SDL_SCANCODE_LSHIFT;
  c.keys[cross][1] = SDL_SCANCODE_KP_2;
  c.key_count[cross] = 2;
  ASSERT_EQ(1, SaveControlsFile(LAUNCHER_CONTROLS_PATH, "no_such_example.cfg", &c));
  ReadControlsFile(LAUNCHER_CONTROLS_PATH, &read);
  ASSERT_TRUE(AreControlsEqual(&c, &read));
}

UTEST(launcher_controls, save_starts_from_the_example_without_a_controls_file) {
  launcher_controls c;
  char *text;

  remove(LAUNCHER_CONTROLS_PATH);
  WriteWholeFile(LAUNCHER_CONTROLS_EXAMPLE_PATH, "# example keys\ncross    = Z\n");
  ResetControls(&c);
  c.keys[FindPadButton("cross")][0] = SDL_SCANCODE_K;
  ASSERT_EQ(1, SaveControlsFile(LAUNCHER_CONTROLS_PATH, LAUNCHER_CONTROLS_EXAMPLE_PATH, &c));
  text = ReadWholeFile(LAUNCHER_CONTROLS_PATH);
  ASSERT_TRUE(text != 0);
  ASSERT_TRUE(strstr(text, "# example keys\ncross    = K\n") == text);
  SDL_free(text);
}

UTEST(launcher_controls, save_keeps_the_controls_files_other_lines) {
  launcher_controls c;
  char *text;

  WriteWholeFile(LAUNCHER_CONTROLS_PATH, "# mine\nstart = Return\n\nselect = Space\n");
  ReadControlsFile(LAUNCHER_CONTROLS_PATH, &c);
  c.keys[FindPadButton("select")][0] = SDL_SCANCODE_BACKSPACE;
  ASSERT_EQ(1, SaveControlsFile(LAUNCHER_CONTROLS_PATH, "no_such_example.cfg", &c));
  text = ReadWholeFile(LAUNCHER_CONTROLS_PATH);
  ASSERT_TRUE(text != 0);
  ASSERT_TRUE(strstr(text, "# mine\nstart = Return\n\nselect = Backspace\n") == text);
  SDL_free(text);
}
