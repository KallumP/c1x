#include "utest.h"
#include "pc/rebound.h"

UTEST(rebound, a_custom_level_looks_through_every_neighbour_again) {
  ASSERT_EQ(0, ReboundSearchFrom(LID_TEST, 2));
}

UTEST(rebound, the_games_own_levels_look_on_from_where_they_were) {
  ASSERT_EQ(2, ReboundSearchFrom(LID_CORTEXPOWER, 2));
}

UTEST(rebound, a_custom_level_gives_up_a_ray_after_its_steps) {
  ASSERT_FALSE(ReboundGivesUp(LID_TEST, REBOUND_STEPS_MAX - 1));
  ASSERT_TRUE(ReboundGivesUp(LID_TEST, REBOUND_STEPS_MAX));
}

UTEST(rebound, the_games_own_levels_never_give_up_a_ray) {
  ASSERT_FALSE(ReboundGivesUp(LID_CORTEXPOWER, REBOUND_STEPS_MAX));
}
