#include "utest.h"
#include "pc/outfit.h"

static rgb8 colour(uint32_t color) {
  rgb8 c;

  c.r = color >> 16;
  c.g = (color >> 8) & 0xFF;
  c.b = color & 0xFF;
  return c;
}

/* colours of crash's model's polygons (WillG), and of the hog he rides (WH1hG) */
#define FUR          0xFF3100
#define FUR_SHADED   0x661400
#define BELLY        0xFF7600
#define SHORTS       0x002790
#define SHORTS_DARK  0x0A0A46
#define SHOES        0x330000
#define SHOES_DARK   0x130000
#define HAIR         0x9D0000
#define HAIR_DARK    0x440000
#define SKIN         0xDF7F7F
#define NOSE         0x0C0928
#define EYEBROW      0x281500
#define HOG          0x664825
#define HOG_DARK     0x380E00
#define HOG_RED      0x440D00
#define BLACK        0x000000

UTEST(outfit, his_orange_shades_are_fur) {
  ASSERT_EQ(OUTFIT_PART_FUR, OutfitPart(colour(FUR)));
  ASSERT_EQ(OUTFIT_PART_FUR, OutfitPart(colour(FUR_SHADED)));
}

UTEST(outfit, the_lighter_orange_down_his_front_is_belly) {
  ASSERT_EQ(OUTFIT_PART_BELLY, OutfitPart(colour(BELLY)));
}

UTEST(outfit, his_blues_are_shorts) {
  ASSERT_EQ(OUTFIT_PART_SHORTS, OutfitPart(colour(SHORTS)));
  ASSERT_EQ(OUTFIT_PART_SHORTS, OutfitPart(colour(SHORTS_DARK)));
}

UTEST(outfit, his_darkest_reds_are_shoes) {
  ASSERT_EQ(OUTFIT_PART_SHOES, OutfitPart(colour(SHOES)));
  ASSERT_EQ(OUTFIT_PART_SHOES, OutfitPart(colour(SHOES_DARK)));
}

UTEST(outfit, his_hair_is_no_part_of_the_outfit) {
  ASSERT_EQ(OUTFIT_PART_NONE, OutfitPart(colour(HAIR)));
  ASSERT_EQ(OUTFIT_PART_NONE, OutfitPart(colour(HAIR_DARK)));
}

UTEST(outfit, his_face_is_no_part_of_the_outfit) {
  ASSERT_EQ(OUTFIT_PART_NONE, OutfitPart(colour(SKIN)));
  ASSERT_EQ(OUTFIT_PART_NONE, OutfitPart(colour(NOSE)));
  ASSERT_EQ(OUTFIT_PART_NONE, OutfitPart(colour(EYEBROW)));
  ASSERT_EQ(OUTFIT_PART_NONE, OutfitPart(colour(BLACK)));
}

UTEST(outfit, the_hog_he_rides_is_no_part_of_the_outfit) {
  ASSERT_EQ(OUTFIT_PART_NONE, OutfitPart(colour(HOG)));
  ASSERT_EQ(OUTFIT_PART_NONE, OutfitPart(colour(HOG_DARK)));
  ASSERT_EQ(OUTFIT_PART_NONE, OutfitPart(colour(HOG_RED)));
}
