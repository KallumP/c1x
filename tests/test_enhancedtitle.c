#include "utest.h"
#include "pc/enhancedtitle.h"

#define LOGO_PIECE_STATUS 0x0          /* the logo's 3D pieces */
#define MENU_SUBTYPE      20

/* a title screen just loaded */
static enhanced_title JustLoaded(void) {
  enhanced_title title;

  EnhancedTitleReset(&title);
  return title;
}

/* a title screen whose logo has landed: its TM has appeared */
static enhanced_title LogoLanded(void) {
  enhanced_title title = JustLoaded();

  EnhancedTitleNoteObject(&title, TITLE_LOGO_SUBTYPE, TITLE_LOGO_FLAG_2D);
  return title;
}

UTEST(enhancedtitle, not_drawn_before_the_logo_lands) {
  enhanced_title title = JustLoaded();

  EnhancedTitleNoteObject(&title, TITLE_LOGO_SUBTYPE, LOGO_PIECE_STATUS); /* swinging in */
  ASSERT_FALSE(EnhancedTitleDrawsWith(&title, ENHANCED_TITLE_ANCHOR));
}

UTEST(enhancedtitle, drawn_with_start_once_the_logos_tm_appears) {
  enhanced_title title = LogoLanded();

  ASSERT_TRUE(EnhancedTitleDrawsWith(&title, "START"));
}

UTEST(enhancedtitle, drawn_only_with_start) {
  enhanced_title title = LogoLanded();

  ASSERT_FALSE(EnhancedTitleDrawsWith(&title, "OPTIONS"));
  ASSERT_FALSE(EnhancedTitleDrawsWith(&title, ">"));
}

UTEST(enhancedtitle, other_flat_objects_arent_the_tm) {
  enhanced_title title = JustLoaded();

  EnhancedTitleNoteObject(&title, MENU_SUBTYPE, TITLE_LOGO_FLAG_2D);
  ASSERT_FALSE(EnhancedTitleDrawsWith(&title, ENHANCED_TITLE_ANCHOR));
}

UTEST(enhancedtitle, loading_the_title_again_waits_for_the_logo_again) {
  enhanced_title title = LogoLanded();

  EnhancedTitleReset(&title);
  ASSERT_FALSE(EnhancedTitleDrawsWith(&title, ENHANCED_TITLE_ANCHOR));
}

UTEST(enhancedtitle, coop_mode_reaches_just_past_n_hanceds_right_edge) {
  rect2 n_hanced, coop;

  EnhancedTitleAt(&n_hanced);
  EnhancedTitleCoopAt(&coop);
  ASSERT_EQ(n_hanced.x + (int32_t)n_hanced.w + ENHANCED_TITLE_COOP_OVERHANG, coop.x + (int32_t)coop.w);
}

UTEST(enhancedtitle, coop_mode_sits_over_the_right_end_of_n_hanceds_underline) {
  rect2 n_hanced, coop;

  EnhancedTitleAt(&n_hanced);
  EnhancedTitleCoopAt(&coop);
  ASSERT_EQ(n_hanced.y + (int32_t)n_hanced.h - ENHANCED_TITLE_COOP_RISE, coop.y + (int32_t)coop.h);
}

UTEST(enhancedtitle, coop_mode_shows_with_two_players_under_n_hanced) {
  ASSERT_TRUE(EnhancedTitleShowsCoop(1, 1));
}

UTEST(enhancedtitle, coop_mode_doesnt_show_with_one_player) {
  ASSERT_FALSE(EnhancedTitleShowsCoop(1, 0));
}

/* it sits over N-Hanced's underline, so it'd float on its own without it */
UTEST(enhancedtitle, coop_mode_doesnt_show_without_n_hanced) {
  ASSERT_FALSE(EnhancedTitleShowsCoop(0, 1));
}
