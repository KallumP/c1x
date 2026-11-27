#ifndef _PC_OUTFIT_H_
#define _PC_OUTFIT_H_

#include "common.h"
#include "geom.h"

/*
 * a player's outfit (pc): crash's model is mostly polygons of one flat colour,
 * and his fur, shorts and shoes are each shades of a colour of their own, so
 * each can be drawn in a colour the player chose instead
 */
#define CRASH_FUR_COLOR    0xFF3100 /* crash's own colours, as 0xRRGGBB */
#define CRASH_BELLY_COLOR  0xFF7600
#define CRASH_HAIR_COLOR   0x9D0000
#define CRASH_SHORTS_COLOR 0x002790
#define CRASH_SHOES_COLOR  0x330000

typedef struct {
  uint32_t fur;
  uint32_t belly;  /* and the patch on his back, and his muzzle, paler */
  uint32_t hair;
  uint32_t shorts;
  uint32_t shoes;  /* and his gloves */
} crash_outfit;

#define OUTFIT_PART_NONE   0
#define OUTFIT_PART_FUR    1
#define OUTFIT_PART_BELLY  2 /* the lighter fur down his front, and on his back */
#define OUTFIT_PART_SHORTS 3
#define OUTFIT_PART_SHOES  4 /* and his gloves, the same colours */
#define OUTFIT_PART_MUZZLE 5 /* the pink around his mouth, drawn a paler belly colour */
#define OUTFIT_PART_HAIR   6
#define OUTFIT_PART_SHOE_LINES 7 /* the lines on his shoes' caps, in their texture */

extern int OutfitPart(rgb8 color);
extern rgb8 OutfitRecolor(rgb8 color, const crash_outfit *outfit);
extern uint16_t OutfitRecolorPixel(uint16_t pixel, const void *outfit);

#endif /* _PC_OUTFIT_H_ */
