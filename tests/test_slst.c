#include "utest.h"
#include "slst.h"

/* the sizes the original game gives its sort lists: 2610 polygons for the
   title and intro, 1460 for every other level */
UTEST(slst, the_games_own_levels_keep_the_original_sort_list_sizes) {
  ASSERT_EQ(1460, SlstPolyIdCount(LID_NSANITYBEACH));
  ASSERT_EQ(2610, SlstPolyIdCount(LID_TITLE));
  ASSERT_EQ(2610, SlstPolyIdCount(LID_INTRO));
}

UTEST(slst, custom_levels_list_as_many_polygons_as_a_delta_can_index) {
  /* a remove node holds a list index + 1 in 12 bits (SlstUpdate): up to
     4095, so indices 0 to 4094, which is 4095 polygons */
  ASSERT_EQ(SLST_CUSTOM_POLY_IDS, SlstPolyIdCount(LID_TEST));
}
