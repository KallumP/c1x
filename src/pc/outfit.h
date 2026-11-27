#ifndef _PC_OUTFIT_H_
#define _PC_OUTFIT_H_

#include "common.h"
#include "geom.h"

/*
 * a player's outfit: each part of crash's models is shades of a colour of its
 * own, in its flat-coloured polygons and in his textures' palettes, so a part
 * is told by its colour and drawn in the colour the player chose
 */
#define CRASH_FUR_COLOR    0xFF3100 /* crash's own colours, as 0xRRGGBB */
#define CRASH_BELLY_COLOR  0xFF7600
#define CRASH_HAIR_COLOR   0x9D0000
#define CRASH_SHORTS_COLOR 0x002790
#define CRASH_SHOES_COLOR  0x330000

#define SKUNK_FUR_COLOR    0x33333A /* the Skunk preset, which player two starts in */
#define SKUNK_BELLY_COLOR  0xF0F0F0
#define SKUNK_HAIR_COLOR   0xF0F0F0
#define SKUNK_SHORTS_COLOR 0x7A3E9D
#define SKUNK_SHOES_COLOR  0x2D2D2D

typedef struct {
  uint32_t fur;
  uint32_t belly;  /* and the patch on his back; his muzzle is a paler shade */
  uint32_t hair;
  uint32_t shorts;
  uint32_t shoes;  /* and his gloves */
} crash_outfit;

#define OUTFIT_PART_NONE       0
#define OUTFIT_PART_FUR        1 /* all his oranges, belly too */
#define OUTFIT_PART_SHORTS     2
#define OUTFIT_PART_SHOES      3
#define OUTFIT_PART_MUZZLE     4
#define OUTFIT_PART_HAIR       5
#define OUTFIT_PART_SHOE_LINES 6 /* in his shoes' texture */

#define OUTFIT_COLOUR_FUR    0
#define OUTFIT_COLOUR_BELLY  1
#define OUTFIT_COLOUR_HAIR   2
#define OUTFIT_COLOUR_SHORTS 3
#define OUTFIT_COLOUR_SHOES  4
#define OUTFIT_COLOUR_COUNT  5

typedef struct {
  const char *label;
  const char *covers;
} outfit_colour;

extern const outfit_colour outfit_colours[OUTFIT_COLOUR_COUNT];

#define OUTFIT_PRESET_DEFAULT 0
#define OUTFIT_PRESET_SKUNK   1
#define OUTFIT_NO_PRESET      -1

typedef struct {
  const char *name;
  crash_outfit outfit;
} outfit_preset;

extern const outfit_preset outfit_presets[];
extern const int outfit_preset_count;

extern uint32_t *OutfitColour(crash_outfit *outfit, int colour_idx);
extern int OutfitFindPreset(const crash_outfit *outfit);
extern const char *OutfitPresetName(const crash_outfit *outfit);
extern int OutfitsEqual(const crash_outfit *a, const crash_outfit *b);
extern int OutfitIsCrashsOwn(const crash_outfit *outfit);
extern int OutfitPart(rgb8 color);
extern rgb8 OutfitRecolor(rgb8 color, const crash_outfit *outfit);
extern uint16_t OutfitRecolorPixel(uint16_t pixel, const crash_outfit *outfit);

#endif /* _PC_OUTFIT_H_ */
