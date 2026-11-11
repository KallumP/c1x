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
