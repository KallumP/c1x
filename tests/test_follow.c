#include "utest.h"
#include "pc/follow.h"

UTEST(follow, stays_put_on_target) {
  ASSERT_EQ(5000, FollowCamOffset(5000, 5000));
}

UTEST(follow, eases_a_fraction_of_the_way_each_frame) {
  ASSERT_EQ(8000 / FOLLOW_CAM_EASE, FollowCamOffset(0, 8000));
  ASSERT_EQ(-8000 / FOLLOW_CAM_EASE, FollowCamOffset(0, -8000));
}

UTEST(follow, moves_at_most_a_step_a_frame) {
  ASSERT_EQ(FOLLOW_CAM_STEP_MAX, FollowCamOffset(0, 100 * FOLLOW_CAM_STEP_MAX));
  ASSERT_EQ(-FOLLOW_CAM_STEP_MAX, FollowCamOffset(0, -100 * FOLLOW_CAM_STEP_MAX));
}

#define CRASH_RUN_A_FRAME (140 << 8) /* about how far crash runs sideways a frame */

/* how far the camera trails crash after he's run sideways for some frames */
static int32_t TrailAfterRunning(int frames) {
  int32_t offset = 0, crash_x = 0;
  int i;

  for (i=0;i<frames;i++) {
    crash_x += CRASH_RUN_A_FRAME;
    offset = FollowCamOffset(offset, crash_x);
  }
  return crash_x - offset;
}

UTEST(follow, keeps_up_with_crash_running_sideways) {
  /* it trails him by a steady distance, rather than falling ever further behind */
  ASSERT_EQ(TrailAfterRunning(100), TrailAfterRunning(200));
}

UTEST(follow, reaches_the_target_in_the_end) {
  int32_t offset = 0;
  int i;

  for (i=0;i<200;i++)
    offset = FollowCamOffset(offset, 123456);
  ASSERT_EQ(123456, offset);
}

UTEST(follow, takes_crashs_height_as_the_ground_while_hes_on_it) {
  ASSERT_EQ(5000, FollowCamGroundY(0, 5000, 1));
  ASSERT_EQ(-5000, FollowCamGroundY(0, -5000, 1));
}

UTEST(follow, keeps_the_ground_while_crash_jumps) {
  ASSERT_EQ(0, FollowCamGroundY(0, 5000, 0));
}

UTEST(follow, follows_crash_down_when_he_drops_below_the_ground) {
  ASSERT_EQ(-5000, FollowCamGroundY(0, -5000, 0));
}

UTEST(follow, starts_from_crashs_height) {
  ASSERT_EQ(5000, FollowCamGroundY(FOLLOW_CAM_NO_GROUND, 5000, 0));
}

UTEST(follow, starts_at_its_paths_height) {
  /* crash's floor is right below the path: it's where it should be already */
  int32_t floor_y = 1000, path_y = 1000 + FOLLOW_CAM_HEIGHT;

  ASSERT_EQ(path_y, FollowCamHeight(FOLLOW_CAM_NO_HEIGHT, floor_y, path_y, FOLLOW_CAM_HEIGHT));
}

UTEST(follow, eases_towards_its_height_above_crashs_floor) {
  int32_t floor_y = 6000, path_y = 1000, height = 1000;
  int32_t level_sets = FollowCamAbove(2632);

  ASSERT_EQ(FollowCamOffset(height, floor_y + FOLLOW_CAM_HEIGHT),
    FollowCamHeight(height, floor_y, path_y, FOLLOW_CAM_HEIGHT));
  ASSERT_EQ(FollowCamOffset(height, floor_y + level_sets),
    FollowCamHeight(height, floor_y, path_y, level_sets));
  ASSERT_EQ(floor_y + level_sets, FollowCamHeight(floor_y + level_sets, floor_y, path_y, level_sets));
}

UTEST(follow, keeps_its_height_when_its_paths_height_jumps) {
  /* the path is over a wall top, high above crash: the camera doesn't jump up to it */
  int32_t floor_y = 1000, height = 1000 + FOLLOW_CAM_HEIGHT;
  int32_t path_y = height, path_y_over_a_wall = 2000000 + FOLLOW_CAM_HEIGHT, path_y_in_a_pit = -2000000;

  ASSERT_EQ(height, FollowCamHeight(height, floor_y, path_y, FOLLOW_CAM_HEIGHT));
  ASSERT_EQ(height, FollowCamHeight(height, floor_y, path_y_over_a_wall, FOLLOW_CAM_HEIGHT));
  ASSERT_EQ(height, FollowCamHeight(height, floor_y, path_y_in_a_pit, FOLLOW_CAM_HEIGHT));
}

UTEST(follow, its_height_above_crash_is_the_one_its_path_keeps_or_the_usual_one) {
  ASSERT_EQ(2632 << 8, FollowCamAbove(2632));
  ASSERT_EQ(FOLLOW_CAM_HEIGHT, FollowCamAbove(0)); /* a path built before levels set it */
}
