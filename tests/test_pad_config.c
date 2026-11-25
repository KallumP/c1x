#include <string.h>
#include "utest.h"
#include "pc/pad.h"
#include "pc/controls.h"
#include "test_files.h"

#define CONFIG_PATH "build/test_controls.cfg"

extern uint8_t keys[512]; /* defined in test_pad.c */

/* the buttons held while only the given key is pressed */
static uint32_t held_for(SDL_Scancode code) {
  memset(keys, 0, sizeof(keys));
  keys[code] = 1;
  return SwPadRead(0) >> 16;
}

/* WASD to move, space to jump, K to spin */
UTEST(pad_config, the_default_keys_are_a_wasd_layout) {
  static const struct { SDL_Scancode key; uint32_t buttons; } layout[] = {
    { SDL_SCANCODE_W, PAD_UP }, { SDL_SCANCODE_A, PAD_LEFT }, { SDL_SCANCODE_S, PAD_DOWN }, { SDL_SCANCODE_D, PAD_RIGHT },
    { SDL_SCANCODE_SPACE, PAD_CROSS }, { SDL_SCANCODE_K, PAD_SQUARE }, { SDL_SCANCODE_SEMICOLON, PAD_CIRCLE }, { SDL_SCANCODE_O, PAD_TRIANGLE },
    { SDL_SCANCODE_Q, PAD_L1 }, { SDL_SCANCODE_P, PAD_R1 }, { SDL_SCANCODE_E, PAD_L2 }, { SDL_SCANCODE_I, PAD_R2 },
    { SDL_SCANCODE_R, PAD_L3 }, { SDL_SCANCODE_U, PAD_R3 }, { SDL_SCANCODE_J, PAD_START }, { SDL_SCANCODE_F, PAD_SELECT },
  };
  size_t i;

  PadResetBindings();
  for (i = 0; i < sizeof(layout) / sizeof(layout[0]); i++) {
    EXPECT_EQ(layout[i].buttons, held_for(layout[i].key));
  }
}

UTEST(pad_config, missing_file_keeps_defaults) {
  PadResetBindings();
  remove(CONFIG_PATH);
  ASSERT_EQ(-1, PadLoadBindings(CONFIG_PATH));
  ASSERT_EQ((uint32_t)PAD_CROSS, held_for(SDL_SCANCODE_SPACE));
}

UTEST(pad_config, binding_replaces_default_key) {
  PadResetBindings();
  WriteWholeFile(CONFIG_PATH, "cross = V\n");
  ASSERT_EQ(1, PadLoadBindings(CONFIG_PATH));
  ASSERT_EQ((uint32_t)PAD_CROSS, held_for(SDL_SCANCODE_V));
  ASSERT_EQ(0u, held_for(SDL_SCANCODE_SPACE));
}

UTEST(pad_config, unlisted_buttons_keep_defaults) {
  PadResetBindings();
  WriteWholeFile(CONFIG_PATH, "cross = V\n");
  ASSERT_EQ(1, PadLoadBindings(CONFIG_PATH));
  ASSERT_EQ((uint32_t)PAD_SQUARE, held_for(SDL_SCANCODE_K));
  ASSERT_EQ((uint32_t)PAD_UP, held_for(SDL_SCANCODE_W));
}

UTEST(pad_config, invalid_lines_are_skipped) {
  PadResetBindings();
  WriteWholeFile(CONFIG_PATH, "jump = Z\r\ncircle = B\r\ncross = Banana\r\n");
  ASSERT_EQ(1, PadLoadBindings(CONFIG_PATH));
  ASSERT_EQ((uint32_t)PAD_CIRCLE, held_for(SDL_SCANCODE_B));
  ASSERT_EQ(0u, held_for(SDL_SCANCODE_SEMICOLON));
  ASSERT_EQ((uint32_t)PAD_CROSS, held_for(SDL_SCANCODE_SPACE));
}

UTEST(pad_config, comments_and_blank_lines_are_ignored) {
  PadResetBindings();
  WriteWholeFile(CONFIG_PATH, "# controls\n\ntriangle = V\n");
  ASSERT_EQ(1, PadLoadBindings(CONFIG_PATH));
  ASSERT_EQ((uint32_t)PAD_TRIANGLE, held_for(SDL_SCANCODE_V));
  ASSERT_EQ(0u, held_for(SDL_SCANCODE_O));
}

UTEST(pad_config, reset_restores_defaults) {
  WriteWholeFile(CONFIG_PATH, "cross = V\n");
  PadLoadBindings(CONFIG_PATH);
  PadResetBindings();
  ASSERT_EQ((uint32_t)PAD_CROSS, held_for(SDL_SCANCODE_SPACE));
  ASSERT_EQ(0u, held_for(SDL_SCANCODE_V));
}

UTEST(pad_config, repeated_lines_add_keys) {
  PadResetBindings();
  WriteWholeFile(CONFIG_PATH, "cross = V\ncross = B\n");
  ASSERT_EQ(2, PadLoadBindings(CONFIG_PATH));
  ASSERT_EQ((uint32_t)PAD_CROSS, held_for(SDL_SCANCODE_V));
  ASSERT_EQ((uint32_t)PAD_CROSS, held_for(SDL_SCANCODE_B));
  ASSERT_EQ(0u, held_for(SDL_SCANCODE_SPACE));
}

UTEST(pad_config, one_key_can_press_several_buttons) {
  PadResetBindings();
  WriteWholeFile(CONFIG_PATH, "cross = V\nsquare = V\n");
  ASSERT_EQ(2, PadLoadBindings(CONFIG_PATH));
  ASSERT_EQ((uint32_t)(PAD_CROSS | PAD_SQUARE), held_for(SDL_SCANCODE_V));
}

UTEST(pad_config, reloading_replaces_previous_file) {
  PadResetBindings();
  WriteWholeFile(CONFIG_PATH, "cross = V\ncross = B\n");
  PadLoadBindings(CONFIG_PATH);
  WriteWholeFile(CONFIG_PATH, "cross = N\n");
  ASSERT_EQ(1, PadLoadBindings(CONFIG_PATH));
  ASSERT_EQ((uint32_t)PAD_CROSS, held_for(SDL_SCANCODE_N));
  ASSERT_EQ(0u, held_for(SDL_SCANCODE_V));
  ASSERT_EQ(0u, held_for(SDL_SCANCODE_B));
}

/* the example file documents the built-in defaults, so it must match them */
UTEST(pad_config, example_controls_file_matches_defaults) {
  uint32_t defaults[512];
  int i;

  PadResetBindings();
  for (i=0;i<512;i++)
    defaults[i] = held_for((SDL_Scancode)i);
  /* run from the project root */
  /* a line per default key, player two's too */
  ASSERT_EQ(PAD_DEFAULT_KEY_COUNT + PAD_P2_DEFAULT_KEY_COUNT,
    PadLoadBindings("controls.example.cfg"));
  for (i=0;i<512;i++)
    EXPECT_EQ(defaults[i], held_for((SDL_Scancode)i));
}

/* player two's buttons held while only the given key is pressed */
static uint32_t player_two_held_for(SDL_Scancode code) {
  memset(keys, 0, sizeof(keys));
  keys[code] = 1;
  return PadKeysHeld(1);
}

/* arrows to move, the number pad's 0, 4, 6 and 8 for the face buttons: beside the WASD layout */
UTEST(pad_config, player_two_default_keys_are_the_arrows_and_number_pad) {
  static const struct { SDL_Scancode key; uint32_t buttons; } layout[] = {
    { SDL_SCANCODE_UP, PAD_UP }, { SDL_SCANCODE_LEFT, PAD_LEFT },
    { SDL_SCANCODE_DOWN, PAD_DOWN }, { SDL_SCANCODE_RIGHT, PAD_RIGHT },
    { SDL_SCANCODE_KP_0, PAD_CROSS }, { SDL_SCANCODE_KP_4, PAD_SQUARE },
    { SDL_SCANCODE_KP_6, PAD_CIRCLE }, { SDL_SCANCODE_KP_8, PAD_TRIANGLE },
  };
  size_t i;

  PadResetBindings();
  for (i = 0; i < sizeof(layout) / sizeof(layout[0]); i++) {
    EXPECT_EQ(layout[i].buttons, player_two_held_for(layout[i].key));
  }
}

UTEST(pad_config, player_two_default_keys_dont_press_player_one_buttons) {
  PadResetBindings();
  ASSERT_EQ(0u, held_for(SDL_SCANCODE_UP));
}

UTEST(pad_config, a_p2_line_binds_a_player_two_key) {
  PadResetBindings();
  WriteWholeFile(CONFIG_PATH, "p2 cross = V\n");
  PadLoadBindings(CONFIG_PATH);
  ASSERT_EQ((uint32_t)PAD_CROSS, player_two_held_for(SDL_SCANCODE_V));
}

UTEST(pad_config, a_p2_line_replaces_player_two_default_key) {
  PadResetBindings();
  WriteWholeFile(CONFIG_PATH, "p2 cross = V\n");
  PadLoadBindings(CONFIG_PATH);
  ASSERT_EQ(0u, player_two_held_for(SDL_SCANCODE_KP_0));
}

UTEST(pad_config, a_p2_line_leaves_player_one_keys_alone) {
  PadResetBindings();
  WriteWholeFile(CONFIG_PATH, "p2 cross = V\n");
  PadLoadBindings(CONFIG_PATH);
  ASSERT_EQ((uint32_t)PAD_CROSS, held_for(SDL_SCANCODE_SPACE));
}

UTEST(pad_config, a_player_one_line_leaves_player_two_keys_alone) {
  PadResetBindings();
  WriteWholeFile(CONFIG_PATH, "cross = V\n");
  PadLoadBindings(CONFIG_PATH);
  ASSERT_EQ((uint32_t)PAD_CROSS, player_two_held_for(SDL_SCANCODE_KP_0));
}

/* controller layouts are shared by both players, so a p2 line only binds keys */
UTEST(pad_config, a_p2_controller_line_is_skipped) {
  PadResetBindings();
  WriteWholeFile(CONFIG_PATH, "p2 cross = pad:b\n");
  ASSERT_EQ(0, PadLoadBindings(CONFIG_PATH));
}

UTEST(pad_config, example_controls_file_matches_player_two_defaults) {
  uint32_t defaults[512];
  int i;

  PadResetBindings();
  for (i=0;i<512;i++)
    defaults[i] = player_two_held_for((SDL_Scancode)i);
  PadLoadBindings("controls.example.cfg"); /* run from the project root */
  for (i=0;i<512;i++)
    EXPECT_EQ(defaults[i], player_two_held_for((SDL_Scancode)i));
}
