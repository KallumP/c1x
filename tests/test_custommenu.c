#include "utest.h"
#include "pc/custommenu.h"

/* the game's menu rows */
#define START_ROW     0
#define LOAD_GAME_ROW 1
#define PASSWORD_ROW  2
#define OPTIONS_ROW   3
#define NOTHING       0

static custom_menu NewMenu(void) {
  custom_menu menu;

  CustomMenuReset(&menu);
  return menu;
}

/* press buttons for a frame with the game's cursor on game_row, then let go; what the game's menu was shown */
static uint32_t Press(custom_menu *menu, int game_row, uint32_t buttons) {
  uint32_t shown = CustomMenuShowGame(menu, game_row, buttons);

  CustomMenuShowGame(menu, game_row, NOTHING);
  return shown;
}

/* a menu with the cursor moved down from LOAD GAME onto CUSTOM LEVEL */
static custom_menu OnCustomFromAbove(void) {
  custom_menu menu = NewMenu();

  Press(&menu, LOAD_GAME_ROW, CUSTOM_MENU_DOWN);
  return menu;
}

/* a menu with the cursor moved up from PASSWORD onto CUSTOM LEVEL */
static custom_menu OnCustomFromBelow(void) {
  custom_menu menu = NewMenu();

  Press(&menu, PASSWORD_ROW, CUSTOM_MENU_UP);
  return menu;
}

UTEST(custommenu, password_and_options_are_drawn_a_row_lower) {
  ASSERT_EQ(0, CustomMenuItemRow(START_ROW));
  ASSERT_EQ(1, CustomMenuItemRow(LOAD_GAME_ROW));
  ASSERT_EQ(3, CustomMenuItemRow(PASSWORD_ROW));
  ASSERT_EQ(4, CustomMenuItemRow(OPTIONS_ROW));
}

UTEST(custommenu, the_cursor_is_drawn_on_the_games_item) {
  custom_menu menu = NewMenu();

  ASSERT_EQ(0, CustomMenuCursorRow(&menu, START_ROW));
  ASSERT_EQ(4, CustomMenuCursorRow(&menu, OPTIONS_ROW));
}

UTEST(custommenu, moves_between_the_games_rows_are_shown_to_the_game) {
  custom_menu menu = NewMenu();

  ASSERT_EQ((uint32_t)CUSTOM_MENU_DOWN, Press(&menu, START_ROW, CUSTOM_MENU_DOWN));
  ASSERT_EQ((uint32_t)CUSTOM_MENU_UP, Press(&menu, LOAD_GAME_ROW, CUSTOM_MENU_UP));
  ASSERT_EQ((uint32_t)CUSTOM_MENU_DOWN, Press(&menu, PASSWORD_ROW, CUSTOM_MENU_DOWN));
  ASSERT_FALSE(menu.on_custom);
}

UTEST(custommenu, down_from_load_game_goes_to_custom_level) {
  custom_menu menu = NewMenu();

  ASSERT_EQ((uint32_t)NOTHING, Press(&menu, LOAD_GAME_ROW, CUSTOM_MENU_DOWN));
  ASSERT_TRUE(menu.on_custom);
  ASSERT_EQ(CUSTOM_MENU_ROW, CustomMenuCursorRow(&menu, LOAD_GAME_ROW));
}

UTEST(custommenu, up_from_password_goes_to_custom_level) {
  custom_menu menu = NewMenu();

  ASSERT_EQ((uint32_t)NOTHING, Press(&menu, PASSWORD_ROW, CUSTOM_MENU_UP));
  ASSERT_TRUE(menu.on_custom);
  ASSERT_EQ(CUSTOM_MENU_ROW, CustomMenuCursorRow(&menu, PASSWORD_ROW));
}

UTEST(custommenu, a_kept_button_stays_kept_while_its_held) {
  custom_menu menu = NewMenu();

  ASSERT_EQ((uint32_t)NOTHING, CustomMenuShowGame(&menu, LOAD_GAME_ROW, CUSTOM_MENU_DOWN));
  ASSERT_EQ((uint32_t)NOTHING, CustomMenuShowGame(&menu, LOAD_GAME_ROW, CUSTOM_MENU_DOWN));
  ASSERT_TRUE(menu.on_custom); /* holding it doesn't move on */
}

UTEST(custommenu, down_from_custom_level_goes_to_password) {
  custom_menu from_above = OnCustomFromAbove();
  custom_menu from_below = OnCustomFromBelow();

  /* the game's cursor is on LOAD GAME: it's moved down */
  ASSERT_EQ((uint32_t)CUSTOM_MENU_DOWN, Press(&from_above, LOAD_GAME_ROW, CUSTOM_MENU_DOWN));
  ASSERT_FALSE(from_above.on_custom);
  /* the game's cursor is on PASSWORD already */
  ASSERT_EQ((uint32_t)NOTHING, Press(&from_below, PASSWORD_ROW, CUSTOM_MENU_DOWN));
  ASSERT_FALSE(from_below.on_custom);
}

UTEST(custommenu, up_from_custom_level_goes_to_load_game) {
  custom_menu from_above = OnCustomFromAbove();
  custom_menu from_below = OnCustomFromBelow();

  /* the game's cursor is on LOAD GAME already */
  ASSERT_EQ((uint32_t)NOTHING, Press(&from_above, LOAD_GAME_ROW, CUSTOM_MENU_UP));
  ASSERT_FALSE(from_above.on_custom);
  /* the game's cursor is on PASSWORD: it's moved up */
  ASSERT_EQ((uint32_t)CUSTOM_MENU_UP, Press(&from_below, PASSWORD_ROW, CUSTOM_MENU_UP));
  ASSERT_FALSE(from_below.on_custom);
}

UTEST(custommenu, cross_or_start_on_custom_level_chooses_it) {
  custom_menu with_cross = OnCustomFromAbove();
  custom_menu with_start = OnCustomFromAbove();

  ASSERT_EQ((uint32_t)NOTHING, Press(&with_cross, LOAD_GAME_ROW, CUSTOM_MENU_CROSS));
  ASSERT_TRUE(with_cross.chosen);
  ASSERT_EQ((uint32_t)NOTHING, Press(&with_start, LOAD_GAME_ROW, CUSTOM_MENU_START));
  ASSERT_TRUE(with_start.chosen);
}

UTEST(custommenu, choosing_one_of_the_games_rows_is_left_to_the_game) {
  custom_menu menu = NewMenu();

  ASSERT_EQ((uint32_t)CUSTOM_MENU_CROSS, Press(&menu, LOAD_GAME_ROW, CUSTOM_MENU_CROSS));
  ASSERT_FALSE(menu.chosen);
}

UTEST(custommenu, once_chosen_the_games_menu_is_shown_nothing) {
  custom_menu menu = OnCustomFromAbove();

  Press(&menu, LOAD_GAME_ROW, CUSTOM_MENU_CROSS);
  ASSERT_EQ((uint32_t)NOTHING, Press(&menu, LOAD_GAME_ROW, CUSTOM_MENU_UP));
  ASSERT_EQ((uint32_t)NOTHING, Press(&menu, LOAD_GAME_ROW, CUSTOM_MENU_CROSS));
  ASSERT_TRUE(menu.chosen);
}
