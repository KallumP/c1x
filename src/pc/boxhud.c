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
