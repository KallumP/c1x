#ifndef _PC_OUTFIT_H_
#define _PC_OUTFIT_H_

#include "common.h"
#include "geom.h"
#include "settings.h"

/*
 * a player's outfit (pc): crash's model is mostly polygons of one flat colour,
 * and his fur, shorts and shoes are each shades of a colour of their own, so
 * each can be drawn in a colour the player chose instead
 */
#define OUTFIT_PART_NONE   0
#define OUTFIT_PART_FUR    1
#define OUTFIT_PART_BELLY  2 /* the lighter fur down his front */
#define OUTFIT_PART_SHORTS 3
#define OUTFIT_PART_SHOES  4 /* and his gloves, the same colours */

extern int OutfitPart(rgb8 color);
extern rgb8 OutfitRecolor(rgb8 color, const crash_outfit *outfit);
extern uint16_t OutfitRecolorPixel(uint16_t pixel, const void *outfit);

#endif /* _PC_OUTFIT_H_ */
