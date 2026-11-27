#include "outfit.h"

/* what tells the parts of crash's models (WillG and the rest) apart by colour */
#define FUR_DARKEST      0x60 /* the least red a fur shade has: the hog he rides has darker oranges */
#define FUR_GREEN_MIN    9    /* fur's green, as a percent of its red: his hair is redder */
#define FUR_GREEN        19   /* his fur's own */
#define BELLY_GREEN_MIN  40   /* the belly's is at least this */
#define BELLY_GREEN      46   /* and his belly's own */
#define FUR_GREEN_MAX    50
#define SHORTS_DARKEST   0x40 /* the least blue a shorts shade has: his nose is a darker blue */
#define SHORTS_RED_MAX   0x18
#define SHORTS_GREEN_MAX 0x30
#define SHOES_DARKEST    0x10
#define SHOES_BRIGHTEST  0x33 /* his hair is the brighter pure reds */

/* each part's brightest shade, which is drawn in the chosen colour itself */
#define FUR_BRIGHTEST    0xFF
#define SHORTS_BRIGHTEST 0x90

static int GreenPercent(rgb8 color) {
  return (color.g * 100) / color.r;
}

static int IsOrange(rgb8 color) {
  if (color.b != 0 || color.r < FUR_DARKEST) { return 0; }
  return GreenPercent(color) >= FUR_GREEN_MIN && GreenPercent(color) <= FUR_GREEN_MAX;
}

static int IsBelly(rgb8 color) {
  return IsOrange(color) && GreenPercent(color) >= BELLY_GREEN_MIN;
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

static uint32_t Lightened(uint32_t channel, int toward_belly) {
  return channel + (((0xFF - channel) * toward_belly) / ((BELLY_GREEN - FUR_GREEN) * 4));
}

/* the fur colour for orange, one of his oranges: the yellower it is, from his
   fur's orange to his belly's, the lighter, up to a quarter of the way to white */
static uint32_t FurColor(uint32_t fur, rgb8 orange) {
  int toward_belly;

  toward_belly = GreenPercent(orange) - FUR_GREEN;
  if (toward_belly < 0) { toward_belly = 0; }
  if (toward_belly > BELLY_GREEN - FUR_GREEN) { toward_belly = BELLY_GREEN - FUR_GREEN; }
  return (Lightened((fur >> 16) & 0xFF, toward_belly) << 16)
    | (Lightened((fur >> 8) & 0xFF, toward_belly) << 8)
    | Lightened(fur & 0xFF, toward_belly);
}

/* a polygon of crash's coloured color, in outfit's colour for its part. a part
   left crash's own colour is drawn as it is, shade for shade */
rgb8 OutfitRecolor(rgb8 color, const crash_outfit *outfit) {
  switch (OutfitPart(color)) {
  case OUTFIT_PART_FUR:
  case OUTFIT_PART_BELLY:
    if (outfit->fur == SETTINGS_FUR_COLOR) { return color; }
    return Shaded(FurColor(outfit->fur, color), color, FUR_BRIGHTEST);
  case OUTFIT_PART_SHORTS:
    if (outfit->shorts == SETTINGS_SHORTS_COLOR) { return color; }
    return Shaded(outfit->shorts, color, SHORTS_BRIGHTEST);
  case OUTFIT_PART_SHOES:
    if (outfit->shoes == SETTINGS_SHOES_COLOR) { return color; }
    return Shaded(outfit->shoes, color, SHOES_BRIGHTEST);
  }
  return color;
}

/* five bits of a ps1 pixel's colour as eight, the way the game's textures are drawn */
static int FiveBitsToEight(int five) {
  return ((five * 510) + 31) / 62;
}

/* a ps1 pixel (five bits each of red, green and blue, then its transparency
   bit) of a texture of crash's, in outfit's colours. all zeroes is drawn as
   nothing, so a pixel recoloured black keeps a trace of red */
uint16_t OutfitRecolorPixel(uint16_t pixel, const void *outfit) {
  rgb8 color, recolored;
  uint16_t changed;

  color.r = FiveBitsToEight(pixel & 0x1F);
  color.g = FiveBitsToEight((pixel >> 5) & 0x1F);
  color.b = FiveBitsToEight((pixel >> 10) & 0x1F);
  if (OutfitPart(color) == OUTFIT_PART_NONE) { return pixel; }
  recolored = OutfitRecolor(color, (const crash_outfit*)outfit);
  changed = (recolored.r >> 3) | ((recolored.g >> 3) << 5) | ((recolored.b >> 3) << 10);
  if (changed == 0) { changed = 1; }
  return changed | (pixel & 0x8000);
}
