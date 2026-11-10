#include "utest.h"
#include "ns.h"
#include "pc/levelend.h"

#define BOX_EXEC 34 /* a box's exec slot */

static nsd_ldat custom_ldat; /* big (its loading image), so not on the stack */

/* n as a gool number: fixed point, with 8 bits after the point */
static uint32_t GoolNumber(uint32_t n) {
  return n << 8;
}

static void load_custom_level(int box_total) {
  NSSetCustomLevel("build/levels/mock");
  custom_ldat.box_total = box_total;
  NSKeepBoxTotal(LID_TEST, &custom_ldat);
}

static void unload_custom_level() {
  NSSetCustomLevel("");
  NSKeepBoxTotal(LID_TEST, &custom_ldat);
}

UTEST(levelend, the_end_screen_gets_a_custom_levels_box_total) {
  uint32_t total = 0;

  load_custom_level(58);
  ASSERT_TRUE(LevelEndBoxTotal(LEVELEND_EXEC_GAMOC, GoolNumber(LID_TEST), &total));
  ASSERT_EQ(GoolNumber(58), total);
  unload_custom_level();
}

UTEST(levelend, a_custom_level_without_boxes_has_none_to_break) {
  uint32_t total = 123;

  load_custom_level(0);
  ASSERT_TRUE(LevelEndBoxTotal(LEVELEND_EXEC_GAMOC, GoolNumber(LID_TEST), &total));
  ASSERT_EQ(0u, total);
  unload_custom_level();
}

UTEST(levelend, the_games_own_levels_keep_their_own_totals) {
  uint32_t total = 123;

  load_custom_level(58);
  ASSERT_FALSE(LevelEndBoxTotal(LEVELEND_EXEC_GAMOC, GoolNumber(LID_NSANITYBEACH), &total));
  ASSERT_EQ(123u, total);
  unload_custom_level();
}

UTEST(levelend, other_objects_get_no_total) {
  uint32_t total = 123;

  load_custom_level(58);
  ASSERT_FALSE(LevelEndBoxTotal(BOX_EXEC, GoolNumber(LID_TEST), &total));
  ASSERT_EQ(123u, total);
  unload_custom_level();
}
