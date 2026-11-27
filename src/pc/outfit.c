#include "outfit.h"

/* crash's model's own colours (WillG and his other models), by what tells each part's apart */
#define FUR_DARKEST    0x60 /* the least red a fur shade has: the hog he rides has darker oranges */
#define FUR_GREEN_MIN  17   /* fur's green, as a percent of its red: his hair is redder */
#define BELLY_GREEN    40   /* the belly's is at least this */
#define FUR_GREEN_MAX  50
#define SHORTS_DARKEST 0x40 /* the least blue a shorts shade has: his nose is a darker blue */
#define SHORTS_RED_MAX   0x18
#define SHORTS_GREEN_MAX 0x30
#define SHOES_DARKEST  0x10
#define SHOES_LIGHTEST 0x33 /* his hair is the lighter pure reds */

static int IsOrange(rgb8 color) {
  int green_percent;

  if (color.b != 0 || color.r < FUR_DARKEST) { return 0; }
  green_percent = (color.g * 100) / color.r;
  return green_percent >= FUR_GREEN_MIN && green_percent <= FUR_GREEN_MAX;
}

static int IsBelly(rgb8 color) {
  return IsOrange(color) && (color.g * 100) / color.r >= BELLY_GREEN;
}

static int IsShorts(rgb8 color) {
  return color.b >= SHORTS_DARKEST && color.r <= SHORTS_RED_MAX && color.g <= SHORTS_GREEN_MAX;
}

static int IsShoes(rgb8 color) {
  return color.g == 0 && color.b == 0 && color.r >= SHOES_DARKEST && color.r <= SHOES_LIGHTEST;
}

int OutfitPart(rgb8 color) {
  if (IsBelly(color)) { return OUTFIT_PART_BELLY; }
  if (IsOrange(color)) { return OUTFIT_PART_FUR; }
  if (IsShorts(color)) { return OUTFIT_PART_SHORTS; }
  if (IsShoes(color)) { return OUTFIT_PART_SHOES; }
  return OUTFIT_PART_NONE;
}

rgb8 OutfitRecolor(rgb8 color, const crash_outfit *outfit) {
  return color;
}
