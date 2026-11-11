/*
 * the box counter in the game (pc): creates it with the hud and feeds it the
 * boxes broken each frame, when box_display is on. see boxhud.h
 */
#include "boxhud.h"
#include "globals.h"
#include "pc/settings.h"

#define HUD_HANDLE 1 /* the handle the hud counters are created under */

extern gool_handle handles[8];

static gool_object box_source;          /* the box counter's player link: holds the boxes broken */
static gool_object *unset_box_counter;  /* created, but its start code hasn't run yet */

/*
 * create the box counter with the other hud counters, when box_display is on.
 * it starts as a lives counter; it becomes the box counter once its start code
 * has run (BoxHudUpdate)
 */
void BoxHudCreate() {
  gool_object *counter;

  unset_box_counter = 0;
  if (!game_settings.box_display) { return; }
  BoxHudShowBoxes(&box_source, box_count);
  counter = GoolObjectCreate(&handles[HUD_HANDLE], HUD_EXEC, HUD_LIVES_SUBTYPE, 0, 0, 0);
  if (ISERRORCODE(counter)) { return; }
  unset_box_counter = counter;
}

/* each frame, after the objects update: feed the box counter the boxes broken */
void BoxHudUpdate() {
  if (!game_settings.box_display) { return; }
  BoxHudShowBoxes(&box_source, box_count);
  if (!unset_box_counter) { return; }
  if (unset_box_counter->state == HUD_START_STATE) { return; }
  BoxHudSetUpCounter(unset_box_counter, &box_source);
  unset_box_counter = 0;
}
