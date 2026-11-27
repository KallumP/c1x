#include "outfit.h"

/* what tells the parts of crash's models (WillG and the rest) apart by colour */
#define FUR_DARKEST      0x60 /* the least red a fur shade has: the hog he rides has darker oranges */
#define FUR_GREEN_MIN    17   /* fur's green, as a percent of its red: his hair is redder */
#define BELLY_GREEN      40   /* the belly's is at least this */
#define FUR_GREEN_MAX    50
#define SHORTS_DARKEST   0x40 /* the least blue a shorts shade has: his nose is a darker blue */
#define SHORTS_RED_MAX   0x18
#define SHORTS_GREEN_MAX 0x30
#define SHOES_DARKEST    0x10
#define SHOES_BRIGHTEST  0x33 /* his hair is the brighter pure reds */

/* each part's brightest shade, which is drawn in the chosen colour itself */
#define FUR_BRIGHTEST    0xFF
#define SHORTS_BRIGHTEST 0x90

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
  return color.g == 0 && color.b == 0 && color.r >= SHOES_DARKEST && color.r <= SHOES_BRIGHTEST;
}

int OutfitPart(rgb8 color) {
  if (IsBelly(color)) { return OUTFIT_PART_BELLY; }
  if (IsOrange(color)) { return OUTFIT_PART_FUR; }
  if (IsShorts(color)) { return OUTFIT_PART_SHORTS; }
  if (IsShoes(color)) { return OUTFIT_PART_SHOES; }
  return OUTFIT_PART_NONE;
}

static int Brightest(rgb8 color) {
  int brightest;

  brightest = color.r;
  if (color.g > brightest) { brightest = color.g; }
  if (color.b > brightest) { brightest = color.b; }
  return brightest;
}

/* chosen (0xRRGGBB), as dark as shade is beside its part's brightest shade */
static rgb8 Shaded(uint32_t chosen, rgb8 shade, int part_brightest) {
  rgb8 shaded;
  int brightness;

  brightness = Brightest(shade);
  if (brightness > part_brightest) { brightness = part_brightest; }
  shaded.r = (((chosen >> 16) & 0xFF) * brightness) / part_brightest;
  shaded.g = (((chosen >> 8) & 0xFF) * brightness) / part_brightest;
  shaded.b = ((chosen & 0xFF) * brightness) / part_brightest;
  return shaded;
}

/* a quarter of the way to white */
static uint32_t Lighter(uint32_t color) {
  uint32_t r, g, b;

  r = (color >> 16) & 0xFF;
  g = (color >> 8) & 0xFF;
  b = color & 0xFF;
  r += (0xFF - r) / 4;
  g += (0xFF - g) / 4;
  b += (0xFF - b) / 4;
  return (r << 16) | (g << 8) | b;
}

/* a polygon of crash's coloured color, in outfit's colour for its part. a part
   left crash's own colour is drawn as it is, shade for shade */
rgb8 OutfitRecolor(rgb8 color, const crash_outfit *outfit) {
  switch (OutfitPart(color)) {
  case OUTFIT_PART_FUR:
    if (outfit->fur == SETTINGS_FUR_COLOR) { return color; }
    return Shaded(outfit->fur, color, FUR_BRIGHTEST);
  case OUTFIT_PART_BELLY:
    if (outfit->fur == SETTINGS_FUR_COLOR) { return color; }
    return Shaded(Lighter(outfit->fur), color, FUR_BRIGHTEST);
  case OUTFIT_PART_SHORTS:
    if (outfit->shorts == SETTINGS_SHORTS_COLOR) { return color; }
    return Shaded(outfit->shorts, color, SHORTS_BRIGHTEST);
  case OUTFIT_PART_SHOES:
    if (outfit->shoes == SETTINGS_SHOES_COLOR) { return color; }
    return Shaded(outfit->shoes, color, SHOES_BRIGHTEST);
  }
  return color;
}
