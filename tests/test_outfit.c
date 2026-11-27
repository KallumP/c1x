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
#define MUZZLE       0xDF7F7F
#define MUZZLE_DARK  0xA54D4D
#define TEETH        0xFFE7E7
#define SOLE         0xAA9090
#define NOSE         0x0C0928
#define EYEBROW      0x281500
#define HOG          0x664825
#define HOG_DARK     0x380E00
#define HOG_RED      0x440D00
#define BLACK        0x000000
#define WHITE        0xFFFFFF
#define SHOE_LINE    0x3A0808 /* in his shoes' texture */

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

UTEST(outfit, his_brighter_reds_are_hair) {
  ASSERT_EQ(OUTFIT_PART_HAIR, OutfitPart(colour(HAIR)));
  ASSERT_EQ(OUTFIT_PART_HAIR, OutfitPart(colour(HAIR_DARK)));
}

UTEST(outfit, his_face_is_no_part_of_the_outfit) {
  ASSERT_EQ(OUTFIT_PART_NONE, OutfitPart(colour(TEETH)));
  ASSERT_EQ(OUTFIT_PART_NONE, OutfitPart(colour(NOSE)));
  ASSERT_EQ(OUTFIT_PART_NONE, OutfitPart(colour(EYEBROW)));
  ASSERT_EQ(OUTFIT_PART_NONE, OutfitPart(colour(BLACK)));
}

UTEST(outfit, the_hog_he_rides_is_no_part_of_the_outfit) {
  ASSERT_EQ(OUTFIT_PART_NONE, OutfitPart(colour(HOG)));
  ASSERT_EQ(OUTFIT_PART_NONE, OutfitPart(colour(HOG_DARK)));
  ASSERT_EQ(OUTFIT_PART_NONE, OutfitPart(colour(HOG_RED)));
}

#define GREEN        0x00FF00
#define HALF_GREEN   0x008000

static crash_outfit his_own(void) {
  return (crash_outfit){ SETTINGS_FUR_COLOR, SETTINGS_SHORTS_COLOR, SETTINGS_SHOES_COLOR,
    SETTINGS_BELLY_COLOR, SETTINGS_HAIR_COLOR };
}

static uint32_t recolored(uint32_t color, crash_outfit outfit) {
  rgb8 c = OutfitRecolor(colour(color), &outfit);

  return (c.r << 16) | (c.g << 8) | c.b;
}

UTEST(outfit, crashs_own_colours_leave_every_part_as_it_is) {
  ASSERT_EQ((uint32_t)FUR_SHADED, recolored(FUR_SHADED, his_own()));
  ASSERT_EQ((uint32_t)BELLY, recolored(BELLY, his_own()));
  ASSERT_EQ((uint32_t)SHORTS_DARK, recolored(SHORTS_DARK, his_own()));
  ASSERT_EQ((uint32_t)SHOES_DARK, recolored(SHOES_DARK, his_own()));
}

UTEST(outfit, his_brightest_fur_is_drawn_in_the_fur_colour) {
  crash_outfit outfit = his_own();

  outfit.fur = GREEN;
  ASSERT_EQ((uint32_t)GREEN, recolored(FUR, outfit));
}

UTEST(outfit, shaded_fur_is_as_much_darker_in_the_fur_colour) {
  crash_outfit outfit = his_own();

  outfit.fur = GREEN;
  ASSERT_EQ((uint32_t)0x006600, recolored(FUR_SHADED, outfit));
}

UTEST(outfit, his_belly_is_drawn_in_the_belly_colour) {
  crash_outfit outfit = his_own();

  outfit.belly = GREEN;
  ASSERT_EQ((uint32_t)GREEN, recolored(BELLY, outfit));
}

UTEST(outfit, his_brightest_hair_is_drawn_in_the_hair_colour) {
  crash_outfit outfit = his_own();

  outfit.hair = GREEN;
  ASSERT_EQ((uint32_t)GREEN, recolored(HAIR, outfit));
}

UTEST(outfit, his_brightest_shorts_are_drawn_in_the_shorts_colour) {
  crash_outfit outfit = his_own();

  outfit.shorts = GREEN;
  ASSERT_EQ((uint32_t)GREEN, recolored(SHORTS, outfit));
}

UTEST(outfit, his_brightest_shoes_are_drawn_in_the_shoes_colour) {
  crash_outfit outfit = his_own();

  outfit.shoes = GREEN;
  ASSERT_EQ((uint32_t)GREEN, recolored(SHOES, outfit));
}

UTEST(outfit, a_colour_for_one_part_leaves_the_others) {
  crash_outfit outfit = his_own();

  outfit.fur = GREEN;
  ASSERT_EQ((uint32_t)SHORTS, recolored(SHORTS, outfit));
  ASSERT_EQ((uint32_t)SHOES, recolored(SHOES, outfit));
}

UTEST(outfit, colours_of_no_part_stay_as_they_are) {
  crash_outfit outfit = { GREEN, GREEN, GREEN, GREEN, GREEN };

  ASSERT_EQ((uint32_t)NOSE, recolored(NOSE, outfit));
  ASSERT_EQ((uint32_t)TEETH, recolored(TEETH, outfit));
}

/* the palette of the texture on his back (WillT): oranges from redder than his fur to his belly's */
#define BACK_REDDEST  0xF01800
#define BACK_MIDWAY   0xFF5A00

UTEST(outfit, the_reddest_orange_on_his_back_is_fur) {
  ASSERT_EQ(OUTFIT_PART_FUR, OutfitPart(colour(BACK_REDDEST)));
}

UTEST(outfit, an_orange_between_his_fur_and_his_belly_is_as_far_between_their_colours) {
  crash_outfit outfit = his_own();

  outfit.fur = BLACK;
  outfit.belly = WHITE;
  ASSERT_EQ((uint32_t)0x979797, recolored(BACK_MIDWAY, outfit));
}

/* ps1 pixels: five bits each of red, green and blue from the low bit up, then a transparency bit */
#define PIXEL_FUR       0x00DF /* 0xFF3100, to five bits */
#define PIXEL_GREEN     0x03E0
#define PIXEL_WHITE     0x7FFF
#define PIXEL_SEE_THROUGH 0x8000

UTEST(outfit, a_fur_pixel_is_drawn_in_the_fur_colour) {
  crash_outfit outfit = his_own();

  outfit.fur = GREEN;
  ASSERT_EQ(PIXEL_GREEN, OutfitRecolorPixel(PIXEL_FUR, &outfit));
}

UTEST(outfit, a_recoloured_pixel_keeps_its_transparency_bit) {
  crash_outfit outfit = his_own();

  outfit.fur = GREEN;
  ASSERT_EQ(PIXEL_GREEN | PIXEL_SEE_THROUGH, OutfitRecolorPixel(PIXEL_FUR | PIXEL_SEE_THROUGH, &outfit));
}

UTEST(outfit, a_pixel_of_no_part_stays_as_it_is) {
  crash_outfit outfit = { GREEN, GREEN, GREEN, GREEN, GREEN };

  ASSERT_EQ(PIXEL_WHITE, OutfitRecolorPixel(PIXEL_WHITE, &outfit));
}

UTEST(outfit, a_pixel_recoloured_black_isnt_the_all_zero_pixel_which_is_drawn_as_nothing) {
  crash_outfit outfit = his_own();

  outfit.fur = BLACK;
  ASSERT_NE(0, OutfitRecolorPixel(PIXEL_FUR, &outfit));
}

UTEST(outfit, his_pinks_are_muzzle) {
  ASSERT_EQ(OUTFIT_PART_MUZZLE, OutfitPart(colour(MUZZLE)));
  ASSERT_EQ(OUTFIT_PART_MUZZLE, OutfitPart(colour(MUZZLE_DARK)));
}

UTEST(outfit, the_pinkish_soles_of_his_shoes_are_no_part_of_the_outfit) {
  ASSERT_EQ(OUTFIT_PART_NONE, OutfitPart(colour(SOLE)));
}

UTEST(outfit, his_brightest_muzzle_is_the_belly_colour_halfway_to_white) {
  crash_outfit outfit = his_own();

  outfit.belly = HALF_GREEN;
  ASSERT_EQ((uint32_t)0x7FBF7F, recolored(MUZZLE, outfit));
}

UTEST(outfit, his_muzzle_stays_pink_with_crashs_own_belly) {
  crash_outfit outfit = his_own();

  outfit.fur = GREEN;
  ASSERT_EQ((uint32_t)MUZZLE, recolored(MUZZLE, outfit));
}

UTEST(outfit, the_lines_on_his_shoes_caps_are_shoe_lines) {
  ASSERT_EQ(OUTFIT_PART_SHOE_LINES, OutfitPart(colour(SHOE_LINE)));
}

UTEST(outfit, the_lines_on_his_shoes_caps_are_half_as_bright_as_the_shoe_colour) {
  crash_outfit outfit = his_own();

  outfit.shoes = GREEN;
  ASSERT_EQ((uint32_t)0x007F00, recolored(SHOE_LINE, outfit));
}
