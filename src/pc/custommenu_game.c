/*
 * CUSTOM LEVEL on the game's title screen menu (pc): follows the game's
 * cursor, keeps the pad from the game's menu while its own row is used, says
 * where the menu's text is drawn and starts the level. see custommenu.h
 */
#include "custommenu.h"
#include "globals.h"
#include "gool.h"
#include "ns.h"
#include "pad.h"

#define MAIN_MENU_STATE 5  /* title_state on the main menu */
#define NO_NEXT_LEVEL   -1

extern ns_struct ns;
extern pad pads[2];
extern lid_t next_lid;

static custom_menu menu;
static int game_row; /* the row the game's cursor is on */

/* is the main menu up, with a custom level for it to start? */
static int IsMenuUp(void) {
  return NSHasCustomLevel() && ns.ldat && ns.ldat->lid == LID_TITLE
    && title_state == MAIN_MENU_STATE;
}

static int IsMenuObject(gool_object *obj) {
  return obj->subtype == MENU_SUBTYPE;
}

static int IsCursor(gool_object *obj) {
  return IsMenuObject(obj) && obj->trans.x == MENU_CURSOR_X;
}

/* the row of the game's four that a menu object is on */
static int RowOf(gool_object *obj) {
  return (MENU_TOP_ROW_Y - obj->trans.y) / MENU_ROW_HEIGHT;
}

/* the main menu has loaded: its cursor starts on one of the game's rows */
void CustomMenuLoaded(void) {
  CustomMenuReset(&menu);
  game_row = 0;
}

/* each object as it updates: the game's cursor says which row it's on */
void CustomMenuSeeObject(gool_object *obj) {
  if (!IsMenuUp()) { return; }
  if (IsCursor(obj))
    game_row = RowOf(obj);
}

static void StartCustomLevel(void) {
  if (next_lid == NO_NEXT_LEVEL)
    next_lid = LID_TEST;
}

/* once the pad is read, before the game's menu reads it */
void CustomMenuReadPad(void) {
  if (!IsMenuUp()) { return; }
  pads[0].held = CustomMenuShowGame(&menu, game_row, pads[0].held);
  pads[0].tapped &= pads[0].held;
  if (menu.chosen)
    StartCustomLevel();
}

/* how far down the screen to draw a menu object's text: onto its row of the five */
int32_t CustomMenuTextDrop(gool_object *obj) {
  int row, drawn_row;

  if (!IsMenuUp() || !IsMenuObject(obj)) { return 0; }
  row = RowOf(obj);
  if (IsCursor(obj))
    drawn_row = CustomMenuCursorRow(&menu, row);
  else
    drawn_row = CustomMenuItemRow(row);
  return (drawn_row - row) * MENU_ROW_SCREEN_HEIGHT;
}

/* whether obj is the menu's top item (START), which CUSTOM LEVEL is drawn along with */
int CustomMenuIsTopItem(gool_object *obj) {
  return IsMenuUp() && IsMenuObject(obj) && !IsCursor(obj) && RowOf(obj) == 0;
}
