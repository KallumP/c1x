#include "outfit.h"
#include "gfx/pixel.h"

/* what tells the parts of crash's models (WillG and the rest) apart by colour.
   percents are a channel as a percent of red; the rest are channel values */
#define FUR_DARKEST              0x60 /* the hog he rides has darker oranges */
#define FUR_GREEN_PERCENT_MIN    9    /* his hair is redder */
#define FUR_GREEN_PERCENT_MAX    50   /* his belly's orange is under this */
#define SHORTS_DARKEST           0x40 /* his nose is a darker blue */
#define SHORTS_RED_MAX           0x18
#define SHORTS_GREEN_MAX         0x30
#define SHOES_DARKEST            0x10
#define SHOES_RED_MAX            0x33 /* his hair is the redder pure reds */
#define SHOE_LINE_RED_MIN        0x34 /* the lines on his shoes' caps */
#define SHOE_LINE_RED_MAX        0x58
#define SHOE_LINE_GREEN_MAX      0x18
#define MUZZLE_DARKEST           0x60
#define MUZZLE_GREEN_PERCENT_MIN 40
#define MUZZLE_GREEN_PERCENT_MAX 65   /* his shoes' soles and his teeth are paler */
#define CRASH_MUZZLE_COLOR       0xDF7F7F

static const crash_outfit crashs_own = {
  .fur = CRASH_FUR_COLOR, .belly = CRASH_BELLY_COLOR, .hair = CRASH_HAIR_COLOR,
  .shorts = CRASH_SHORTS_COLOR, .shoes = CRASH_SHOES_COLOR
};

const outfit_preset outfit_presets[] = { { 0 } };
const int outfit_preset_count = 0;

int OutfitFindPreset(const crash_outfit *outfit) {
  return OUTFIT_NO_PRESET;
}

const char *OutfitPresetName(const crash_outfit *outfit) {
  return "";
}

int OutfitsEqual(const crash_outfit *a, const crash_outfit *b) {
  return a->fur == b->fur && a->belly == b->belly && a->hair == b->hair
    && a->shorts == b->shorts && a->shoes == b->shoes;
}

int OutfitIsCrashsOwn(const crash_outfit *outfit) {
  return OutfitsEqual(outfit, &crashs_own);
}

static rgb8 Rgb8FromHex(uint32_t color) {
  rgb8 rgb;

  rgb.r = (color >> 16) & 0xFF;
  rgb.g = (color >> 8) & 0xFF;
  rgb.b = color & 0xFF;
  return rgb;
}

/* only for colours with some red */
static int GreenPercent(rgb8 color) {
  return (color.g * 100) / color.r;
}

static int IsFur(rgb8 color) {
  if (color.b != 0 || color.r < FUR_DARKEST) { return 0; }
  return GreenPercent(color) >= FUR_GREEN_PERCENT_MIN && GreenPercent(color) <= FUR_GREEN_PERCENT_MAX;
}

static int IsShorts(rgb8 color) {
  return color.b >= SHORTS_DARKEST && color.r <= SHORTS_RED_MAX && color.g <= SHORTS_GREEN_MAX;
}

static int IsPureRed(rgb8 color) {
  return color.g == 0 && color.b == 0;
}

static int IsShoes(rgb8 color) {
  return IsPureRed(color) && color.r >= SHOES_DARKEST && color.r <= SHOES_RED_MAX;
}

static int IsHair(rgb8 color) {
  return IsPureRed(color) && color.r > SHOES_RED_MAX;
}

static int IsShoeLine(rgb8 color) {
  return color.g == color.b && color.g > 0 && color.g <= SHOE_LINE_GREEN_MAX
    && color.r >= SHOE_LINE_RED_MIN && color.r <= SHOE_LINE_RED_MAX;
}

static int IsMuzzle(rgb8 color) {
  if (color.g != color.b || color.r < MUZZLE_DARKEST) { return 0; }
  return GreenPercent(color) >= MUZZLE_GREEN_PERCENT_MIN && GreenPercent(color) <= MUZZLE_GREEN_PERCENT_MAX;
}

int OutfitPart(rgb8 color) {
  if (IsFur(color)) { return OUTFIT_PART_FUR; }
  if (IsShorts(color)) { return OUTFIT_PART_SHORTS; }
  if (IsShoes(color)) { return OUTFIT_PART_SHOES; }
  if (IsHair(color)) { return OUTFIT_PART_HAIR; }
  if (IsShoeLine(color)) { return OUTFIT_PART_SHOE_LINES; }
  if (IsMuzzle(color)) { return OUTFIT_PART_MUZZLE; }
  return OUTFIT_PART_NONE;
}

static int Brightest(rgb8 color) {
  int brightest;

  brightest = color.r;
  if (color.g > brightest) { brightest = color.g; }
  if (color.b > brightest) { brightest = color.b; }
  return brightest;
}

/* chosen, as much darker as shade is than its part's own (brightest) colour */
static rgb8 Shaded(uint32_t chosen, rgb8 shade, uint32_t own) {
  rgb8 chosen_rgb, shaded;
  int brightness, own_brightness;

  chosen_rgb = Rgb8FromHex(chosen);
  own_brightness = Brightest(Rgb8FromHex(own));
  brightness = Brightest(shade);
  if (brightness > own_brightness) { brightness = own_brightness; }
  shaded.r = (chosen_rgb.r * brightness) / own_brightness;
  shaded.g = (chosen_rgb.g * brightness) / own_brightness;
  shaded.b = (chosen_rgb.b * brightness) / own_brightness;
  return shaded;
}

static uint32_t MixedChannel(uint32_t from, uint32_t to, int shift, int amount, int whole) {
  int32_t from_channel, to_channel;

  from_channel = (from >> shift) & 0xFF;
  to_channel = (to >> shift) & 0xFF;
  return (uint32_t)(from_channel + (((to_channel - from_channel) * amount) / whole)) << shift;
}

/* amount/whole of the way from from to to */
static uint32_t Mixed(uint32_t from, uint32_t to, int amount, int whole) {
  return MixedChannel(from, to, 16, amount, whole)
    | MixedChannel(from, to, 8, amount, whole)
    | MixedChannel(from, to, 0, amount, whole);
}

static uint32_t Halfway(uint32_t from, uint32_t to) {
  return Mixed(from, to, 1, 2);
}

static int FurToBelly(void) {
  return GreenPercent(Rgb8FromHex(CRASH_BELLY_COLOR)) - GreenPercent(Rgb8FromHex(CRASH_FUR_COLOR));
}

/* how far orange is from his fur's orange to his belly's, out of FurToBelly */
static int TowardBelly(rgb8 orange) {
  int toward_belly;

  toward_belly = GreenPercent(orange) - GreenPercent(Rgb8FromHex(CRASH_FUR_COLOR));
  if (toward_belly < 0) { return 0; }
  if (toward_belly > FurToBelly()) { return FurToBelly(); }
  return toward_belly;
}

/* the patch on his back fades from his fur to his belly, so his oranges between
   the two take the colour as far between the chosen ones */
static uint32_t OrangeColor(const crash_outfit *outfit, rgb8 orange) {
  return Mixed(outfit->fur, outfit->belly, TowardBelly(orange), FurToBelly());
}

static int IsCrashsOwnOrange(const crash_outfit *outfit, rgb8 orange) {
  int toward_belly;

  toward_belly = TowardBelly(orange);
  if (outfit->fur == CRASH_FUR_COLOR && outfit->belly == CRASH_BELLY_COLOR) { return 1; }
  if (toward_belly == 0) { return outfit->fur == CRASH_FUR_COLOR; }
  if (toward_belly == FurToBelly()) { return outfit->belly == CRASH_BELLY_COLOR; }
  return 0;
}

/* a part left crash's own colour is drawn as it is, shade for shade */
rgb8 OutfitRecolor(rgb8 color, const crash_outfit *outfit) {
  switch (OutfitPart(color)) {
  case OUTFIT_PART_FUR:
    if (IsCrashsOwnOrange(outfit, color)) { return color; }
    return Shaded(OrangeColor(outfit, color), color, CRASH_FUR_COLOR);
  case OUTFIT_PART_MUZZLE:
    if (outfit->belly == CRASH_BELLY_COLOR) { return color; }
    /* as pale beside the belly as his own muzzle is */
    return Shaded(Halfway(outfit->belly, 0xFFFFFF), color, CRASH_MUZZLE_COLOR);
  case OUTFIT_PART_HAIR:
    if (outfit->hair == CRASH_HAIR_COLOR) { return color; }
    return Shaded(outfit->hair, color, CRASH_HAIR_COLOR);
  case OUTFIT_PART_SHORTS:
    if (outfit->shorts == CRASH_SHORTS_COLOR) { return color; }
    return Shaded(outfit->shorts, color, CRASH_SHORTS_COLOR);
  case OUTFIT_PART_SHOES:
    if (outfit->shoes == CRASH_SHOES_COLOR) { return color; }
    return Shaded(outfit->shoes, color, CRASH_SHOES_COLOR);
  case OUTFIT_PART_SHOE_LINES:
    if (outfit->shoes == CRASH_SHOES_COLOR) { return color; }
    /* his own are lighter than his dark shoes; half the chosen colour shows on pale ones too */
    return Rgb8FromHex(Halfway(outfit->shoes, 0x000000));
  }
  return color;
}

static uint16_t PackedPixel(rgb8 color) {
  return (color.r >> 3) | ((color.g >> 3) << 5) | ((color.b >> 3) << 10);
}

/* pixel is five bits each of red, green and blue, then a transparency bit.
   all zeroes is drawn as nothing, so a pixel recoloured black keeps a trace of red */
uint16_t OutfitRecolorPixel(uint16_t pixel, const crash_outfit *outfit) {
  rgb8 color;
  uint32_t rgba;
  uint16_t packed;

  rgba = pixel_5551_8888(pixel, 1);
  color.r = rgba & 0xFF;
  color.g = (rgba >> 8) & 0xFF;
  color.b = (rgba >> 16) & 0xFF;
  if (OutfitPart(color) == OUTFIT_PART_NONE) { return pixel; }
  packed = PackedPixel(OutfitRecolor(color, outfit));
  if (packed == 0) { packed = 1; }
  return packed | (pixel & 0x8000);
}
