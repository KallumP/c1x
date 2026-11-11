#ifndef _PC_BOXHUD_H_
#define _PC_BOXHUD_H_

#include "common.h"
#include "gool.h"
#include "formats/tgeo.h"

/*
 * the box counter (pc): a copy of the hud's lives counter that shows the boxes
 * broken (box_count) behind a crate icon. the hud draws icons as sprites, and
 * has no crate one, so the icon is made from the plain crate model's front face
 *
 * a hud counter (exec 4) shows one of its registers, picked by HUD_SHOWN_REG_IDX.
 * its start code copies that register from its player link; then, while the two
 * differ, it slides in and counts its own copy up to the player's. the box
 * counter's player link is a source object holding the boxes broken instead
 */
#define HUD_EXEC            4    /* the hud counters' exec slot (DispC) */
#define HUD_LIVES_SUBTYPE   0    /* the lives counter; it doesn't spin its icon, as wumpa does */
#define HUD_START_STATE     0    /* the lives counter's start state, which picks its register, place and icon */
#define HUD_SHOWN_REG_IDX   0x4a /* obj[0x188]: which register (shifted 8 left) a counter shows */
#define HUD_COUNT_REG       0x40 /* the register the box counter shows (wumpa's, on its own source) */
#define BOX_HUD_X           0    /* the top middle, between the wumpa and lives counters */
#define BOX_HUD_ICON_SHADE  0x80 /* the icon's colour: the texture's own, unshaded */

/* a one frame hud sprite: a gool sprite anim with its single texinfo */
typedef struct {
  gool_anim_header;
  eid_t tpage;
  texinfo2 texinfo;
} box_hud_icon;

extern void BoxHudMakeIcon(box_hud_icon *icon, tgeo_texinfo *crate_face);
extern void BoxHudSetUpCounter(gool_object *counter, gool_object *source, box_hud_icon *icon);
extern void BoxHudShowBoxes(gool_object *source, int box_count);

#endif /* _PC_BOXHUD_H_ */
