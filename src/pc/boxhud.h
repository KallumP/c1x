#ifndef _PC_BOXHUD_H_
#define _PC_BOXHUD_H_

#include "common.h"
#include "gool.h"

/*
 * the box counter (pc): a copy of the hud's lives counter that shows the boxes
 * broken (box_count) at the top middle, with no icon
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
#define HUD_DIGITS_OFFSET_X 0x1c00 /* a counter's digits (its child) sit this far right of it */
#define BOX_HUD_X           (-HUD_DIGITS_OFFSET_X) /* so its digits, centred, are at the top middle */
#define OBJECT_HANDLE_TYPE  1    /* an object's handle type; a handle of objects' is 2 */

extern void BoxHudSetUpCounter(gool_object *counter, gool_object *source);
extern void BoxHudShowBoxes(gool_object *source, int boxes_broken);
extern void BoxHudText(char *text, size_t size, int broken, int total);
extern int BoxHudIsCounterDigits(gool_object *digits, gool_object *source);

/* in the game (boxhud_game.c) */
extern void BoxHudCreate();
extern void BoxHudUpdate();
extern int BoxHudCounterText(gool_object *obj, char *text, size_t size);

#endif /* _PC_BOXHUD_H_ */
