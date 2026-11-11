/*
 * the box counter in the game (pc): creates it with the hud and feeds it the
 * boxes broken each frame, when box_display is on. see boxhud.h
 */
#include "boxhud.h"
#include "globals.h"
#include "ns.h"
#include "pc/settings.h"
#include "pc/boxtotals.h"

#define HUD_HANDLE 1 /* the handle the hud counters are created under */

extern ns_struct ns;
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

/*
 * the box counter's digits draw "broken/total" instead of one number: if obj
 * is them, write that into text and return 1. the number broken is the one the
 * counter shows, which counts up to the boxes broken as it slides in
 */
int BoxHudCounterText(gool_object *obj, char *text, size_t size) {
  int shown;

  if (!game_settings.box_display) { return 0; }
  if (!BoxHudIsCounterDigits(obj, &box_source)) { return 0; }
  shown = obj->parent->regs[HUD_COUNT_REG] >> 8;
  BoxHudText(text, size, shown, LevelBoxTotal(ns.ldat->lid));
  return 1;
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
