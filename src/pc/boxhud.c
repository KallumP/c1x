/*
 * the box counter (pc), see boxhud.h
 */
#include "boxhud.h"

/* the box counter's icon: a sprite of the crate face's texture, in its own colours */
void BoxHudMakeIcon(box_hud_icon *icon, tgeo_texinfo *crate_face) {
  memset(icon, 0, sizeof(*icon));
  icon->type = GOOL_ANIM_TYPE_SPRITE;
  icon->length = 1;
  icon->tpage = crate_face->tpage;
  icon->texinfo.colinfo = crate_face->colinfo;
  icon->texinfo.rgninfo = crate_face->rgninfo;
  icon->texinfo.r = BOX_HUD_ICON_SHADE;
  icon->texinfo.g = BOX_HUD_ICON_SHADE;
  icon->texinfo.b = BOX_HUD_ICON_SHADE;
}

/*
 * turn a lives counter, once its start code has run, into the box counter:
 * showing the source's boxes broken, at the top middle, behind the crate icon.
 * it starts on the boxes already broken, so it only slides in when one breaks
 */
void BoxHudSetUpCounter(gool_object *counter, gool_object *source, box_hud_icon *icon) {
  counter->player = source;
  counter->regs[HUD_SHOWN_REG_IDX] = HUD_COUNT_REG << 8;
  counter->regs[HUD_COUNT_REG] = source->regs[HUD_COUNT_REG];
  counter->trans.x = BOX_HUD_X;
  counter->anim_seq = (gool_anim*)icon;
  counter->anim_frame = 0;
}

/* give the box counter's source the boxes broken (a gool number, 8 bits after the point, as box_count) */
void BoxHudShowBoxes(gool_object *source, int boxes_broken) {
  source->regs[HUD_COUNT_REG] = boxes_broken;
}
