#include "utest.h"
#include "ns.h"
#include "pc/boxtotals.h"

UTEST(boxtotals, a_game_level_has_the_level_end_screens_total) {
  ASSERT_EQ(49, GameLevelBoxTotal(LID_NSANITYBEACH));
  ASSERT_EQ(67, GameLevelBoxTotal(LID_TEMPLERUINS));
}

UTEST(boxtotals, the_last_level_in_the_table_has_its_total) {
  ASSERT_EQ(24, GameLevelBoxTotal(LID_CASTLEMACHINERY));
}

UTEST(boxtotals, a_level_with_no_box_gem_has_no_total) {
  ASSERT_EQ(0, GameLevelBoxTotal(LID_PAPUPAPU));
  ASSERT_EQ(0, GameLevelBoxTotal(LID_THEGREATHALL));
}

static nsd_ldat custom_ldat; /* big (its loading image), so not on the stack */

static void load_custom_level(int box_total) {
  NSSetCustomLevel("build/levels/mock");
  custom_ldat.box_total = box_total;
  NSKeepBoxTotal(LID_TEST, &custom_ldat);
}

static void unload_custom_level() {
  NSSetCustomLevel("");
  NSKeepBoxTotal(LID_TEST, &custom_ldat);
}

UTEST(boxtotals, a_custom_level_has_its_own_total) {
  load_custom_level(58);
  ASSERT_EQ(58, LevelBoxTotal(LID_TEST));
  unload_custom_level();
}

UTEST(boxtotals, a_game_level_has_its_total_from_the_table) {
  ASSERT_EQ(38, LevelBoxTotal(LID_JUNGLEROLLERS));
}
