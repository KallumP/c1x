#ifndef _PC_BOXHUD_H_
#define _PC_BOXHUD_H_

#include "common.h"
#include "formats/gool.h"
#include "formats/tgeo.h"

/*
 * the box counter (pc): a copy of the hud's lives counter that shows the boxes
 * broken (box_count) behind a crate icon. the hud draws icons as sprites, and
 * has no crate one, so the icon is made from the plain crate model's front face
 */
#define BOX_HUD_ICON_SHADE 0x80 /* the icon's colour: the texture's own, unshaded */

/* a one frame hud sprite: a gool sprite anim with its single texinfo */
typedef struct {
  gool_anim_header;
  eid_t tpage;
  texinfo2 texinfo;
} box_hud_icon;

extern void BoxHudMakeIcon(box_hud_icon *icon, tgeo_texinfo *crate_face);

#endif /* _PC_BOXHUD_H_ */
