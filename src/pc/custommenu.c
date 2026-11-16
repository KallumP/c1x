#include "custommenu.h"

/* the menu as it loads: the cursor on one of the game's rows */
void CustomMenuReset(custom_menu *menu) {
  menu->on_custom = 0;
  menu->chosen = 0;
  menu->held_before = 0;
  menu->kept = 0;
}

/* the cursor is on CUSTOM LEVEL: move it off, onto the game's row above or below */
static uint32_t LeaveCustom(custom_menu *menu, int game_row, uint32_t direction,
  int row_wanted) {
  menu->on_custom = 0;
  if (game_row == row_wanted) { return direction; } /* the game's cursor is there already */
  return 0; /* the game moves its cursor there itself */
}

/* which of the buttons just pressed the game's menu isn't shown, with the cursor on CUSTOM LEVEL */
static uint32_t PressedOnCustom(custom_menu *menu, int game_row, uint32_t pressed) {
  if (pressed & CUSTOM_MENU_UP)
    return LeaveCustom(menu, game_row, CUSTOM_MENU_UP, CUSTOM_MENU_ROW_ABOVE);
  if (pressed & CUSTOM_MENU_DOWN)
    return LeaveCustom(menu, game_row, CUSTOM_MENU_DOWN, CUSTOM_MENU_ROW_BELOW);
  if (pressed & CUSTOM_MENU_CHOOSE)
    menu->chosen = 1;
  return pressed & CUSTOM_MENU_CHOOSE;
}

/* ...and with it on one of the game's rows: a move onto CUSTOM LEVEL */
static uint32_t PressedOnGameRow(custom_menu *menu, int game_row, uint32_t pressed) {
  uint32_t onto_custom = 0;

  if (game_row == CUSTOM_MENU_ROW_ABOVE)
    onto_custom = pressed & CUSTOM_MENU_DOWN;
  else if (game_row == CUSTOM_MENU_ROW_BELOW)
    onto_custom = pressed & CUSTOM_MENU_UP;
  if (onto_custom)
    menu->on_custom = 1;
  return onto_custom;
}

static uint32_t PressedAndKept(custom_menu *menu, int game_row, uint32_t pressed) {
  if (menu->on_custom)
    return PressedOnCustom(menu, game_row, pressed);
  return PressedOnGameRow(menu, game_row, pressed);
}

/*
 * each frame, with the buttons held and the row the game's cursor is on:
 * moves the cursor onto or off CUSTOM LEVEL, or chooses it, and returns the
 * held buttons the game's menu is shown
 */
uint32_t CustomMenuShowGame(custom_menu *menu, int game_row, uint32_t held) {
  uint32_t pressed;

  pressed = held & ~menu->held_before;
  menu->held_before = held;
  menu->kept &= held; /* let go: shown again when next pressed */
  if (menu->chosen) { return 0; }
  menu->kept |= PressedAndKept(menu, game_row, pressed);
  if (menu->chosen) { return 0; }
  return held & ~menu->kept;
}

/* the row, of the five, that the game's item on game_row is drawn on */
int CustomMenuItemRow(int game_row) {
  if (game_row >= CUSTOM_MENU_ROW_BELOW) { return game_row + 1; }
  return game_row;
}

/* the row, of the five, that the cursor is drawn on */
int CustomMenuCursorRow(const custom_menu *menu, int game_row) {
  if (menu->on_custom) { return CUSTOM_MENU_ROW; }
  return CustomMenuItemRow(game_row);
}
