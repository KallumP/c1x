#include <stddef.h>
#include "utest.h"
#include "pc/tween.h"
#include "gfx.h"
#include "gool.h"

UTEST(tween, alpha_runs_from_0_to_one_over_a_frame) {
  ASSERT_EQ(0, TweenAlpha(0, 34));
  ASSERT_EQ(TWEEN_ONE/2, TweenAlpha(17, 34));
  ASSERT_EQ(TWEEN_ONE, TweenAlpha(34, 34));
}

UTEST(tween, alpha_stays_between_0_and_one) {
  ASSERT_EQ(0, TweenAlpha(-5, 34));
  ASSERT_EQ(TWEEN_ONE, TweenAlpha(60, 34));
  ASSERT_EQ(TWEEN_ONE, TweenAlpha(10, 0));
}

UTEST(tween, lerp_goes_from_a_to_b) {
  ASSERT_EQ(100, TweenLerp(100, 300, 0));
  ASSERT_EQ(200, TweenLerp(100, 300, TWEEN_ONE/2));
  ASSERT_EQ(300, TweenLerp(100, 300, TWEEN_ONE));
  ASSERT_EQ(-50, TweenLerp(0, -100, TWEEN_ONE/2));
}

UTEST(tween, lerp_does_not_overflow_on_big_positions) {
  ASSERT_EQ(0x30000000, TweenLerp(0x20000000, 0x40000000, TWEEN_ONE/2));
}

UTEST(tween, angle_lerp_takes_the_short_way_round) {
  ASSERT_EQ(0x000, TweenLerpAngle(0xF00, 0x100, TWEEN_ONE/2) & 0xFFF);
  ASSERT_EQ(0x080, TweenLerpAngle(0x000, 0x100, TWEEN_ONE/2));
  ASSERT_EQ(0xF80, TweenLerpAngle(0x000, 0xF00, TWEEN_ONE/2) & 0xFFF);
}

UTEST(tween, angle_lerp_ends_on_b) {
  ASSERT_EQ(0x100, TweenLerpAngle(0xF00, 0x100, TWEEN_ONE));
  ASSERT_EQ(0x2345, TweenLerpAngle(0x10, 0x2345, TWEEN_ONE));
}

UTEST(tween, a_small_move_is_not_a_jump) {
  vec a = { .x = 0, .y = 0, .z = 0 };
  vec b = { .x = 0x8000, .y = -0x8000, .z = 0x100 };

  ASSERT_FALSE(TweenJumped(&a, &b));
}

UTEST(tween, a_teleport_is_a_jump) {
  vec a = { .x = 0, .y = 0, .z = 0 };
  vec b = { .x = 0, .y = 0, .z = -(TWEEN_JUMP+1) };

  ASSERT_TRUE(TweenJumped(&a, &b));
}

UTEST(tween, lerp_vec_lerps_each_axis) {
  vec a = { .x = 0, .y = 100, .z = -100 };
  vec b = { .x = 200, .y = 300, .z = 100 };
  vec out;

  TweenLerpVec(&a, &b, TWEEN_ONE/2, &out);
  ASSERT_EQ(100, out.x);
  ASSERT_EQ(200, out.y);
  ASSERT_EQ(0, out.z);
}

UTEST(tween, at_60_fps_a_frame_is_drawn_half_way_through_a_game_frame) {
  ASSERT_EQ(17, TweenSlotTicks(1, 60));
  ASSERT_EQ(34, TweenSlotTicks(2, 60));
}

UTEST(tween, at_120_fps_three_frames_are_drawn_between_game_frames) {
  ASSERT_EQ(0, TweenSlotsDue(7, 120));
  ASSERT_EQ(1, TweenSlotsDue(9, 120));
  ASSERT_EQ(3, TweenSlotsDue(26, 120));
  ASSERT_TRUE(TweenSlotTicks(3, 120) < 34);
  ASSERT_EQ(34, TweenSlotTicks(4, 120));
}

UTEST(tween, at_30_fps_no_frames_are_drawn_between_game_frames) {
  ASSERT_EQ(0, TweenSlotsDue(33, 30));
  ASSERT_EQ(34, TweenSlotTicks(1, 30));
}

UTEST(tween, a_frame_is_due_once_its_slot_comes_round) {
  ASSERT_FALSE(TweenFrameDue(10, 34, 0, 60)); /* slot 1 is at 17 */
  ASSERT_TRUE(TweenFrameDue(17, 34, 0, 60));
  ASSERT_FALSE(TweenFrameDue(20, 34, 1, 60)); /* slot 1 is drawn */
}

UTEST(tween, no_frame_is_due_at_the_game_frame_itself) {
  ASSERT_FALSE(TweenFrameDue(34, 34, 1, 60));
  ASSERT_FALSE(TweenFrameDue(40, 34, 0, 60));
}

UTEST(tween, a_longer_game_frame_has_more_frames_between) {
  ASSERT_TRUE(TweenFrameDue(35, 51, 1, 60)); /* the intro's 3-vblank frames */
}

UTEST(tween, lerp_ang_lerps_each_angle) {
  ang a = { .x = 0xF00, .y = 0, .z = 0x100 };
  ang b = { .x = 0x100, .y = 0x200, .z = 0x100 };
  ang out;

  TweenLerpAng(&a, &b, TWEEN_ONE/2, &out);
  ASSERT_EQ(0x000, out.x & 0xFFF);
  ASSERT_EQ(0x100, out.y);
  ASSERT_EQ(0x100, out.z);
}

/* a pose at x along each axis, turned by a, at scale s */
static tween_pose Pose(int32_t x, int32_t a, int32_t s) {
  tween_pose pose;
  int i;

  for (i = 0; i < 3; i++) {
    pose.trans.c[i] = x;
    pose.rot.c[i] = a;
    pose.scale.c[i] = s;
  }
  return pose;
}

UTEST(tween_poses, a_pose_is_drawn_part_way_from_the_last_game_frame) {
  tween_pose before, now, out;

  TweenForgetAll();
  before = Pose(0, 0x000, 0x1000);
  now = Pose(1000, 0x100, 0x2000);
  TweenRecord(5, &before);
  TweenPoseAt(5, &now, TWEEN_ONE/2, &out);
  ASSERT_EQ(500, out.trans.x);
  ASSERT_EQ(0x80, out.rot.y);
  ASSERT_EQ(0x1800, out.scale.z);
}

UTEST(tween_poses, an_object_without_a_last_pose_is_drawn_where_it_is) {
  tween_pose now, out;

  TweenForgetAll();
  now = Pose(1000, 0x100, 0x1000);
  TweenPoseAt(7, &now, TWEEN_ONE/2, &out);
  ASSERT_EQ(1000, out.trans.x);
  ASSERT_EQ(0x100, out.rot.x);
}

UTEST(tween_poses, a_new_object_in_a_slot_is_not_tweened_from_the_old_one) {
  tween_pose before, now, out;

  TweenForgetAll();
  before = Pose(0, 0, 0x1000);
  now = Pose(1000, 0, 0x1000);
  TweenRecord(3, &before);
  TweenForget(3);
  TweenPoseAt(3, &now, TWEEN_ONE/2, &out);
  ASSERT_EQ(1000, out.trans.x);
}

UTEST(tween_poses, a_jump_is_not_tweened) {
  tween_pose before, now, out;

  TweenForgetAll();
  before = Pose(0, 0, 0x1000);
  now = Pose(TWEEN_JUMP*2, 0, 0x1000);
  TweenRecord(1, &before);
  TweenPoseAt(1, &now, TWEEN_ONE/2, &out);
  ASSERT_EQ(TWEEN_JUMP*2, out.trans.x);
}

UTEST(tween_poses, a_flip_is_not_tweened) {
  tween_pose before, now, out;

  TweenForgetAll();
  before = Pose(0, 0, 0x1000);
  now = Pose(0, 0, -0x1000);
  TweenRecord(2, &before);
  TweenPoseAt(2, &now, TWEEN_ONE/2, &out);
  ASSERT_EQ(-0x1000, out.scale.x);
}

UTEST(tween_poses, slots_out_of_range_are_drawn_where_they_are) {
  tween_pose before, now, out;

  TweenForgetAll();
  before = Pose(0, 0, 0x1000);
  now = Pose(1000, 0, 0x1000);
  TweenRecord(TWEEN_SLOTS, &before);
  TweenRecord(-1, &before);
  TweenPoseAt(TWEEN_SLOTS, &now, TWEEN_ONE/2, &out);
  ASSERT_EQ(1000, out.trans.x);
}

UTEST(tween_poses, every_object_and_the_camera_have_their_own_slot) {
  ASSERT_LT(GOOL_OBJECT_COUNT, TWEEN_SLOTS); /* the player's */
  ASSERT_GT(TWEEN_CAMERA_SLOT, GOOL_OBJECT_COUNT);
  ASSERT_LT(TWEEN_CAMERA_SLOT, TWEEN_SLOTS);
}

UTEST(tween_poses, the_camera_is_laid_out_as_a_pose) {
  ASSERT_EQ(offsetof(tween_pose, trans), offsetof(cam_state, trans));
  ASSERT_EQ(offsetof(tween_pose, rot), offsetof(cam_state, rot));
  ASSERT_EQ(offsetof(tween_pose, scale), offsetof(cam_state, scale));
}

UTEST(tween_poses, the_camera_is_tweened_between_the_last_two_it_was_drawn_at) {
  tween_pose first, second, out;

  TweenForgetAll();
  first = Pose(0, 0x000, 0x1000);
  second = Pose(1000, 0x100, 0x1000);
  TweenRecordCamera(&first);
  TweenRecordCamera(&second);
  TweenCameraAt(TWEEN_ONE/4, &out);
  ASSERT_EQ(250, out.trans.x);
  ASSERT_EQ(0x40, out.rot.z);
}

UTEST(tween_poses, the_first_camera_is_drawn_where_it_is) {
  tween_pose first, out;

  TweenForgetAll();
  first = Pose(1000, 0x100, 0x1000);
  TweenRecordCamera(&first);
  TweenCameraAt(TWEEN_ONE/4, &out);
  ASSERT_EQ(1000, out.trans.x);
}
