/*
 * the save point text in the game (pc): removed once a save screen opens,
 * with its picture and text (its children). see savepoint.h
 */
#include "savepoint.h"
#include "globals.h"
#include "pc/card_game.h"

extern gool_object *objects;
extern int GoolObjectKill(gool_object *obj, int sig);

/* each frame a card screen is up: the SAVE POINT text, if Tawna made one, goes */
void SavePointClearForCardScreen() {
  int card_screen_up, i;

  card_screen_up = (cur_display_flags & CARD_DISPLAY_FLAG) != 0;
  for (i=0;i<GOOL_OBJECT_COUNT;i++) {
    if (SavePointTextGoes(&objects[i], card_screen_up))
      GoolObjectKill(&objects[i], 0);
  }
}
