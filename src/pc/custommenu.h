#ifndef _PC_CUSTOMMENU_H_
#define _PC_CUSTOMMENU_H_

#include "common.h"

/*
 * CUSTOM LEVEL on the title screen's main menu (pc), under LOAD GAME, which
 * starts the custom level (settings.cfg's boot_level).
 *
 * the game's menu has four rows: START, LOAD GAME, PASSWORD and OPTIONS. its
 * gool code moves a cursor between them and reads the pad itself, so it can't
 * be given a fifth. instead, with a custom level set, the menu is drawn with
 * five: PASSWORD and OPTIONS a row lower, and CUSTOM LEVEL in the gap. the
 * cursor is on CUSTOM LEVEL when it's moved down from LOAD GAME or up from
 * PASSWORD: the game's menu isn't shown that press, so its own cursor stays
 * on the row beside, and the cursor is drawn on CUSTOM LEVEL. a button kept
 * from the game's menu stays kept from it until it's let go
 */
#define CUSTOM_MENU_TEXT       "CUSTOM LEVEL"
#define CUSTOM_MENU_ROW        2  /* the row it's drawn on, of the five */
#define CUSTOM_MENU_ROW_ABOVE  1  /* the game's row above it: LOAD GAME */
#define CUSTOM_MENU_ROW_BELOW  2  /* the game's row below it: PASSWORD */

/* the pad's buttons the menu reads */
#define CUSTOM_MENU_UP      0x1000
#define CUSTOM_MENU_DOWN    0x4000
#define CUSTOM_MENU_CROSS   0x40
#define CUSTOM_MENU_START   0x800
#define CUSTOM_MENU_CHOOSE  (CUSTOM_MENU_CROSS | CUSTOM_MENU_START)

typedef struct {
  int on_custom;        /* the cursor is on CUSTOM LEVEL */
  int chosen;           /* CUSTOM LEVEL was chosen */
  uint32_t held_before; /* the buttons held the frame before */
  uint32_t kept;        /* held buttons the game's menu isn't shown, until they're let go */
} custom_menu;

extern void CustomMenuReset(custom_menu *menu);
extern uint32_t CustomMenuShowGame(custom_menu *menu, int game_row, uint32_t held);
extern int CustomMenuItemRow(int game_row);
extern int CustomMenuCursorRow(const custom_menu *menu, int game_row);

/*
 * the game's main menu (custommenu_game.c). its cursor and items are gool
 * objects (GamOC subtype 20), placed in the game's 2D units: the cursor at
 * MENU_CURSOR_X, the items at MENU_ITEM_X, a row every MENU_ROW_HEIGHT down
 * from MENU_TOP_ROW_Y (MENU_ROW_SCREEN_HEIGHT on screen)
 */
#define MENU_SUBTYPE            20
#define MENU_CURSOR_X           -50624
#define MENU_ITEM_X             -46528
#define MENU_TOP_ROW_Y          -7040
#define MENU_ROW_HEIGHT         4096
#define MENU_ROW_SCREEN_HEIGHT  16
#define CUSTOM_MENU_Y           (MENU_TOP_ROW_Y - CUSTOM_MENU_ROW * MENU_ROW_HEIGHT)

struct _gool_object;
extern void CustomMenuLoaded(void);
extern void CustomMenuSeeObject(struct _gool_object *obj);
extern void CustomMenuReadPad(void);
extern int32_t CustomMenuTextDrop(struct _gool_object *obj);
extern int CustomMenuIsTopItem(struct _gool_object *obj);

#endif /* _PC_CUSTOMMENU_H_ */
