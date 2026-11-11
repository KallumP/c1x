/*
 * the box counter (pc), see boxhud.h
 */
#include "boxhud.h"

/* hide the lives head the counter starts with: a sprite with no size */
static void BoxHudHideIcon(gool_object *counter) {
  counter->scale.x = 0;
  counter->scale.y = 0;
}

/*
 * turn a lives counter, once its start code has run, into the box counter:
 * showing the source's boxes broken, at the top middle, with no icon.
 * it starts on the boxes already broken, so it only slides in when one breaks
 */
void BoxHudSetUpCounter(gool_object *counter, gool_object *source) {
  counter->player = source;
  counter->regs[HUD_SHOWN_REG_IDX] = HUD_COUNT_REG << 8;
  counter->regs[HUD_COUNT_REG] = source->regs[HUD_COUNT_REG];
  counter->trans.x = BOX_HUD_X;
  BoxHudHideIcon(counter);
}

/* the box counter's text: boxes broken out of the total ("12/40"), or just those broken with no total */
void BoxHudText(char *text, size_t size, int broken, int total) {
  if (total > 0)
    snprintf(text, size, "%d/%d", broken, total);
  else
    snprintf(text, size, "%d", broken);
}

/* give the box counter's source the boxes broken (a gool number, 8 bits after the point, as box_count) */
void BoxHudShowBoxes(gool_object *source, int boxes_broken) {
  source->regs[HUD_COUNT_REG] = boxes_broken;
}
