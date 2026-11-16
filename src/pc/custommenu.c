#include "custommenu.h"

void CustomMenuReset(custom_menu *menu) {
}

uint32_t CustomMenuShowGame(custom_menu *menu, int game_row, uint32_t held) {
  return held;
}

int CustomMenuItemRow(int game_row) {
  return game_row;
}

int CustomMenuCursorRow(const custom_menu *menu, int game_row) {
  return game_row;
}
