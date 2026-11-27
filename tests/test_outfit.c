#include "utest.h"
#include "pc/outfit.h"

/* colours of crash's model's polygons (WillG and his other models) */
#define FUR          0xFF3100
#define FUR_DIMMER   0xCC2800
#define FUR_SHADED   0x661400
#define BELLY        0xFF7600
#define BELLY_DIMMER 0xD86400
#define BACK_REDDEST 0xF01800 /* the patch on his back fades from this... */
#define BACK_MIDWAY  0xFF5A00 /* ...through this, to his belly's orange */
#define SHORTS       0x002790
#define SHORTS_DARK  0x0A0A46
#define SHOES        0x330000
#define SHOES_DARK   0x130000
#define SHOE_LINE    0x3A0808 /* in his shoes' texture */
#define HAIR         0x9D0000
#define HAIR_DARK    0x440000
#define MUZZLE       0xDF7F7F
#define MUZZLE_DARK  0xA54D4D
#define TEETH        0xFFE7E7
#define SOLE         0xAA9090
#define NOSE         0x0C0928
#define EYEBROW      0x281500

/* the hog he rides (WH1hG) */
#define HOG          0x664825
#define HOG_DARK     0x380E00
#define HOG_RED      0x440D00

#define BLACK        0x000000
#define WHITE        0xFFFFFF
#define GREEN        0x00FF00
#define HALF_GREEN   0x008000
#define NAVY_ISH     0x123456 /* red, green and blue each different, so a swap shows */
#define RED          0xFF0000

static rgb8 colour(uint32_t hex) {
  rgb8 c;

  c.r = hex >> 16;
  c.g = (hex >> 8) & 0xFF;
  c.b = hex & 0xFF;
  return c;
}

static crash_outfit his_own(void) {
  return (crash_outfit){ .fur = CRASH_FUR_COLOR, .belly = CRASH_BELLY_COLOR, .hair = CRASH_HAIR_COLOR,
    .shorts = CRASH_SHORTS_COLOR, .shoes = CRASH_SHOES_COLOR };
}

static uint32_t recoloured(uint32_t hex, crash_outfit outfit) {
  rgb8 c = OutfitRecolor(colour(hex), &outfit);

  return (c.r << 16) | (c.g << 8) | c.b;
}

/* comparing outfits */

UTEST(outfit, outfits_of_the_same_colours_are_equal) {
  crash_outfit a = his_own(), b = his_own();

  ASSERT_TRUE(OutfitsEqual(&a, &b));
}

UTEST(outfit, outfits_differing_in_any_one_colour_arent_equal) {
  crash_outfit a = his_own(), fur = a, belly = a, hair = a, shorts = a, shoes = a;

  fur.fur = GREEN;
  belly.belly = GREEN;
  hair.hair = GREEN;
  shorts.shorts = GREEN;
  shoes.shoes = GREEN;
  ASSERT_FALSE(OutfitsEqual(&a, &fur));
  ASSERT_FALSE(OutfitsEqual(&a, &belly));
  ASSERT_FALSE(OutfitsEqual(&a, &hair));
  ASSERT_FALSE(OutfitsEqual(&a, &shorts));
  ASSERT_FALSE(OutfitsEqual(&a, &shoes));
}

UTEST(outfit, crashs_own_colours_are_crashs_own_outfit) {
  crash_outfit outfit = his_own();

  ASSERT_TRUE(OutfitIsCrashsOwn(&outfit));
}

UTEST(outfit, a_chosen_colour_isnt_crashs_own_outfit) {
  crash_outfit outfit = his_own();

  outfit.hair = GREEN;
  ASSERT_FALSE(OutfitIsCrashsOwn(&outfit));
}

/* presets */

UTEST(outfit, every_preset_is_found_as_itself) {
  int i;

  for (i=0;i<outfit_preset_count;i++)
    ASSERT_EQ(i, OutfitFindPreset(&outfit_presets[i].outfit));
}

UTEST(outfit, an_outfit_of_no_presets_colours_is_no_preset) {
  crash_outfit outfit = his_own();

  outfit.hair = GREEN;
  ASSERT_EQ(OUTFIT_NO_PRESET, OutfitFindPreset(&outfit));
}

UTEST(outfit, the_default_preset_is_crashs_own_outfit) {
  ASSERT_TRUE(OutfitIsCrashsOwn(&outfit_presets[OUTFIT_PRESET_DEFAULT].outfit));
}

UTEST(outfit, the_default_preset_is_named_default) {
  ASSERT_STREQ("Default", outfit_presets[OUTFIT_PRESET_DEFAULT].name);
}

UTEST(outfit, the_skunk_preset_is_named_skunk) {
  ASSERT_STREQ("Skunk", outfit_presets[OUTFIT_PRESET_SKUNK].name);
}

UTEST(outfit, an_outfit_of_a_presets_colours_is_named_after_it) {
  ASSERT_STREQ("Skunk", OutfitPresetName(&outfit_presets[OUTFIT_PRESET_SKUNK].outfit));
}

UTEST(outfit, an_outfit_of_no_presets_colours_is_named_custom) {
  crash_outfit outfit = his_own();

  outfit.hair = GREEN;
  ASSERT_STREQ("Custom", OutfitPresetName(&outfit));
}

/* which part a colour is */

UTEST(outfit, his_oranges_are_fur) {
  ASSERT_EQ(OUTFIT_PART_FUR, OutfitPart(colour(FUR)));
  ASSERT_EQ(OUTFIT_PART_FUR, OutfitPart(colour(FUR_SHADED)));
}

UTEST(outfit, the_lighter_orange_down_his_front_is_fur) {
  ASSERT_EQ(OUTFIT_PART_FUR, OutfitPart(colour(BELLY)));
}

UTEST(outfit, the_reddest_orange_on_his_back_is_fur) {
  ASSERT_EQ(OUTFIT_PART_FUR, OutfitPart(colour(BACK_REDDEST)));
}

UTEST(outfit, his_blues_are_shorts) {
  ASSERT_EQ(OUTFIT_PART_SHORTS, OutfitPart(colour(SHORTS)));
  ASSERT_EQ(OUTFIT_PART_SHORTS, OutfitPart(colour(SHORTS_DARK)));
}

UTEST(outfit, his_darkest_reds_are_shoes) {
  ASSERT_EQ(OUTFIT_PART_SHOES, OutfitPart(colour(SHOES)));
  ASSERT_EQ(OUTFIT_PART_SHOES, OutfitPart(colour(SHOES_DARK)));
}

UTEST(outfit, the_lines_on_his_shoes_caps_are_shoe_lines) {
  ASSERT_EQ(OUTFIT_PART_SHOE_LINES, OutfitPart(colour(SHOE_LINE)));
}

UTEST(outfit, his_redder_reds_are_hair) {
  ASSERT_EQ(OUTFIT_PART_HAIR, OutfitPart(colour(HAIR)));
  ASSERT_EQ(OUTFIT_PART_HAIR, OutfitPart(colour(HAIR_DARK)));
}

UTEST(outfit, his_pinks_are_muzzle) {
  ASSERT_EQ(OUTFIT_PART_MUZZLE, OutfitPart(colour(MUZZLE)));
  ASSERT_EQ(OUTFIT_PART_MUZZLE, OutfitPart(colour(MUZZLE_DARK)));
}

UTEST(outfit, his_teeth_are_no_part) {
  ASSERT_EQ(OUTFIT_PART_NONE, OutfitPart(colour(TEETH)));
}

UTEST(outfit, the_soles_of_his_shoes_are_no_part) {
  ASSERT_EQ(OUTFIT_PART_NONE, OutfitPart(colour(SOLE)));
}

UTEST(outfit, his_nose_is_no_part) {
  ASSERT_EQ(OUTFIT_PART_NONE, OutfitPart(colour(NOSE)));
}

UTEST(outfit, his_eyebrows_are_no_part) {
  ASSERT_EQ(OUTFIT_PART_NONE, OutfitPart(colour(EYEBROW)));
}

UTEST(outfit, black_is_no_part) {
  ASSERT_EQ(OUTFIT_PART_NONE, OutfitPart(colour(BLACK)));
}

UTEST(outfit, the_hog_he_rides_is_no_part) {
  ASSERT_EQ(OUTFIT_PART_NONE, OutfitPart(colour(HOG)));
  ASSERT_EQ(OUTFIT_PART_NONE, OutfitPart(colour(HOG_DARK)));
  ASSERT_EQ(OUTFIT_PART_NONE, OutfitPart(colour(HOG_RED)));
}

UTEST(outfit, a_yellow_yellower_than_his_belly_is_no_part) {
  ASSERT_EQ(OUTFIT_PART_NONE, OutfitPart(colour(0xFFD000)));
}

UTEST(outfit, a_purple_is_no_part) {
  ASSERT_EQ(OUTFIT_PART_NONE, OutfitPart(colour(0x7A3E9D)));
}

UTEST(outfit, a_light_blue_is_no_part) {
  ASSERT_EQ(OUTFIT_PART_NONE, OutfitPart(colour(0x40C0FF)));
}

/* crash's own colours */

UTEST(outfit, crashs_own_outfit_draws_every_part_as_it_is) {
  ASSERT_EQ((uint32_t)FUR_SHADED, recoloured(FUR_SHADED, his_own()));
  ASSERT_EQ((uint32_t)BACK_MIDWAY, recoloured(BACK_MIDWAY, his_own()));
  ASSERT_EQ((uint32_t)BELLY, recoloured(BELLY, his_own()));
  ASSERT_EQ((uint32_t)SHORTS_DARK, recoloured(SHORTS_DARK, his_own()));
  ASSERT_EQ((uint32_t)SHOES_DARK, recoloured(SHOES_DARK, his_own()));
  ASSERT_EQ((uint32_t)SHOE_LINE, recoloured(SHOE_LINE, his_own()));
  ASSERT_EQ((uint32_t)HAIR_DARK, recoloured(HAIR_DARK, his_own()));
  ASSERT_EQ((uint32_t)MUZZLE_DARK, recoloured(MUZZLE_DARK, his_own()));
}

UTEST(outfit, his_fur_is_drawn_as_it_is_when_only_the_belly_is_chosen) {
  crash_outfit outfit = his_own();

  outfit.belly = WHITE;
  ASSERT_EQ((uint32_t)FUR_DIMMER, recoloured(FUR_DIMMER, outfit));
}

UTEST(outfit, his_belly_is_drawn_as_it_is_when_only_the_fur_is_chosen) {
  crash_outfit outfit = his_own();

  outfit.fur = BLACK;
  ASSERT_EQ((uint32_t)BELLY_DIMMER, recoloured(BELLY_DIMMER, outfit));
}

UTEST(outfit, his_muzzle_is_drawn_as_it_is_while_the_belly_is_crashs_own) {
  crash_outfit outfit = his_own();

  outfit.fur = GREEN;
  ASSERT_EQ((uint32_t)MUZZLE, recoloured(MUZZLE, outfit));
}

UTEST(outfit, choosing_the_fur_leaves_his_shorts_shoes_and_hair) {
  crash_outfit outfit = his_own();

  outfit.fur = GREEN;
  ASSERT_EQ((uint32_t)SHORTS, recoloured(SHORTS, outfit));
  ASSERT_EQ((uint32_t)SHOES, recoloured(SHOES, outfit));
  ASSERT_EQ((uint32_t)HAIR, recoloured(HAIR, outfit));
}

UTEST(outfit, colours_of_no_part_are_drawn_as_they_are) {
  crash_outfit outfit = { .fur = GREEN, .belly = GREEN, .hair = GREEN, .shorts = GREEN, .shoes = GREEN };

  ASSERT_EQ((uint32_t)NOSE, recoloured(NOSE, outfit));
  ASSERT_EQ((uint32_t)TEETH, recoloured(TEETH, outfit));
}

/* chosen colours */

UTEST(outfit, his_brightest_fur_is_the_fur_colour) {
  crash_outfit outfit = his_own();

  outfit.fur = GREEN;
  ASSERT_EQ((uint32_t)GREEN, recoloured(FUR, outfit));
}

UTEST(outfit, a_fur_shade_is_as_much_darker_in_the_fur_colour) {
  crash_outfit outfit = his_own();

  outfit.fur = GREEN;
  ASSERT_EQ((uint32_t)0x006600, recoloured(FUR_SHADED, outfit)); /* 0x66 bright, of fur 0xFF bright */
}

UTEST(outfit, his_belly_is_the_belly_colour) {
  crash_outfit outfit = his_own();

  outfit.belly = GREEN;
  ASSERT_EQ((uint32_t)GREEN, recoloured(BELLY, outfit));
}

UTEST(outfit, an_orange_between_his_fur_and_belly_is_as_far_between_their_colours) {
  crash_outfit outfit = his_own();

  outfit.fur = BLACK;
  outfit.belly = WHITE;
  /* its green is 35% of its red, between his fur's 19% and his belly's 46%:
     16/27 of the way, and 0xFF * 16/27 is 0x97 */
  ASSERT_EQ((uint32_t)0x979797, recoloured(BACK_MIDWAY, outfit));
}

UTEST(outfit, his_brightest_shorts_are_the_shorts_colour) {
  crash_outfit outfit = his_own();

  outfit.shorts = NAVY_ISH;
  ASSERT_EQ((uint32_t)NAVY_ISH, recoloured(SHORTS, outfit));
}

UTEST(outfit, a_shorts_shade_is_as_much_darker_in_the_shorts_colour) {
  crash_outfit outfit = his_own();

  outfit.shorts = NAVY_ISH;
  ASSERT_EQ((uint32_t)0x081929, recoloured(SHORTS_DARK, outfit)); /* 0x46 bright, of shorts 0x90 bright */
}

UTEST(outfit, his_brightest_shoes_are_the_shoes_colour) {
  crash_outfit outfit = his_own();

  outfit.shoes = NAVY_ISH;
  ASSERT_EQ((uint32_t)NAVY_ISH, recoloured(SHOES, outfit));
}

UTEST(outfit, a_shoes_shade_is_as_much_darker_in_the_shoes_colour) {
  crash_outfit outfit = his_own();

  outfit.shoes = NAVY_ISH;
  ASSERT_EQ((uint32_t)0x061320, recoloured(SHOES_DARK, outfit)); /* 0x13 bright, of shoes 0x33 bright */
}

UTEST(outfit, the_lines_on_his_shoes_caps_are_half_the_shoes_colour) {
  crash_outfit outfit = his_own();

  outfit.shoes = GREEN;
  ASSERT_EQ((uint32_t)HALF_GREEN, recoloured(SHOE_LINE, outfit));
}

UTEST(outfit, his_brightest_hair_is_the_hair_colour) {
  crash_outfit outfit = his_own();

  outfit.hair = NAVY_ISH;
  ASSERT_EQ((uint32_t)NAVY_ISH, recoloured(HAIR, outfit));
}

UTEST(outfit, a_hair_shade_is_as_much_darker_in_the_hair_colour) {
  crash_outfit outfit = his_own();

  outfit.hair = NAVY_ISH;
  ASSERT_EQ((uint32_t)0x071625, recoloured(HAIR_DARK, outfit)); /* 0x44 bright, of hair 0x9D bright */
}

UTEST(outfit, a_red_brighter_than_his_hair_is_the_hair_colour) {
  crash_outfit outfit = his_own();

  outfit.hair = NAVY_ISH;
  ASSERT_EQ((uint32_t)NAVY_ISH, recoloured(0xC00000, outfit));
}

UTEST(outfit, his_brightest_muzzle_is_halfway_from_the_belly_colour_to_white) {
  crash_outfit outfit = his_own();

  outfit.belly = HALF_GREEN;
  ASSERT_EQ((uint32_t)0x7FBF7F, recoloured(MUZZLE, outfit));
}

UTEST(outfit, a_muzzle_shade_is_as_much_darker) {
  crash_outfit outfit = his_own();

  outfit.belly = HALF_GREEN;
  ASSERT_EQ((uint32_t)0x5D8D5D, recoloured(MUZZLE_DARK, outfit)); /* 0xA5 bright, of muzzle 0xDF bright */
}

/* texture pixels: five bits each of red, green and blue from the low bit up, then a transparency bit */

#define PIXEL_FUR         0x00DF /* FUR, to five bits */
#define PIXEL_SHORTS      0x4880 /* SHORTS, to five bits */
#define PIXEL_GREEN       0x03E0
#define PIXEL_RED         0x001F
#define PIXEL_WHITE       0x7FFF
#define PIXEL_NOTHING     0x0000 /* drawn as nothing */
#define PIXEL_SEE_THROUGH 0x8000

UTEST(outfit, a_fur_pixel_is_the_fur_colour) {
  crash_outfit outfit = his_own();

  outfit.fur = GREEN;
  ASSERT_EQ(PIXEL_GREEN, OutfitRecolorPixel(PIXEL_FUR, &outfit));
}

UTEST(outfit, a_shorts_pixel_is_the_shorts_colour) {
  crash_outfit outfit = his_own();

  outfit.shorts = RED;
  ASSERT_EQ(PIXEL_RED, OutfitRecolorPixel(PIXEL_SHORTS, &outfit));
}

UTEST(outfit, a_recoloured_pixel_keeps_its_transparency_bit) {
  crash_outfit outfit = his_own();

  outfit.fur = GREEN;
  ASSERT_EQ(PIXEL_GREEN | PIXEL_SEE_THROUGH, OutfitRecolorPixel(PIXEL_FUR | PIXEL_SEE_THROUGH, &outfit));
}

UTEST(outfit, a_pixel_of_no_part_stays_as_it_is) {
  crash_outfit outfit = { .fur = GREEN, .belly = GREEN, .hair = GREEN, .shorts = GREEN, .shoes = GREEN };

  ASSERT_EQ(PIXEL_WHITE, OutfitRecolorPixel(PIXEL_WHITE, &outfit));
}

UTEST(outfit, a_pixel_drawn_as_nothing_stays_drawn_as_nothing) {
  crash_outfit outfit = { .fur = GREEN, .belly = GREEN, .hair = GREEN, .shorts = GREEN, .shoes = GREEN };

  ASSERT_EQ(PIXEL_NOTHING, OutfitRecolorPixel(PIXEL_NOTHING, &outfit));
}

UTEST(outfit, a_pixel_recoloured_black_keeps_a_trace_of_red_so_its_drawn) {
  crash_outfit outfit = his_own();

  outfit.fur = BLACK;
  ASSERT_EQ(0x0001, OutfitRecolorPixel(PIXEL_FUR, &outfit));
}
