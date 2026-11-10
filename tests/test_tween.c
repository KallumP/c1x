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

/* draw a game frame of frame_ticks and the frames between it is due, a tick at a time; returns the frames drawn */
static int DrawGameFrame(tween_pacer *p, int32_t frame_ticks, uint32_t rate) {
  int32_t elapsed;
  int drawn;

  drawn = 1; /* the game frame's own */
  for (elapsed = 0; elapsed < frame_ticks; elapsed++) {
    if (TweenFrameDue(p, elapsed, frame_ticks, rate, 0)) {
      TweenPacerDrew(p, elapsed, rate);
      drawn++;
    }
  }
  TweenPacerNextGameFrame(p, frame_ticks, rate);
  return drawn;
}

/* frames drawn a second over 10 seconds of 34-tick game frames */
static double FramesASecond(uint32_t rate) {
  tween_pacer p;
  int frames, game_frames, i;
  double seconds;

  TweenPacerReset(&p);
  game_frames = 305; /* 10 s: 34000000/0x8000 ticks a second */
  frames = 0;
  for (i = 0; i < game_frames; i++)
    frames += DrawGameFrame(&p, 34, rate);
  seconds = (game_frames * 34.0) * 0x8000 / 34000000.0;
  return frames / seconds;
}

UTEST(tween_pacing, frames_drawn_a_second_match_the_frame_rate) {
  uint32_t rates[] = { 60, 120, 144, 165, 240 };
  int i;

  for (i = 0; i < 5; i++) {
    EXPECT_NEAR((double)rates[i], FramesASecond(rates[i]), 1.0);
  }
}

UTEST(tween_pacing, at_144_fps_three_or_four_frames_are_drawn_between_each_game_frame) {
  tween_pacer p;
  int i, between;

  TweenPacerReset(&p);
  for (i = 0; i < 60; i++) {
    between = DrawGameFrame(&p, 34, 144) - 1;
    ASSERT_GE(between, 3);
    ASSERT_LE(between, 4);
  }
}

UTEST(tween_pacing, a_frame_is_due_once_its_slot_comes_round) {
  tween_pacer p;

  TweenPacerReset(&p);
  ASSERT_FALSE(TweenFrameDue(&p, 17, 34, 60, 0)); /* slot 1 is 17.3 ticks in */
  ASSERT_TRUE(TweenFrameDue(&p, 18, 34, 60, 0));
  TweenPacerDrew(&p, 18, 60);
  ASSERT_FALSE(TweenFrameDue(&p, 20, 34, 60, 0)); /* slot 1 is drawn */
}

UTEST(tween_pacing, no_frame_is_due_at_the_game_frame_itself) {
  tween_pacer p;

  TweenPacerReset(&p);
  ASSERT_FALSE(TweenFrameDue(&p, 34, 34, 60, 0));
  ASSERT_FALSE(TweenFrameDue(&p, 40, 34, 60, 0));
}

UTEST(tween_pacing, no_frame_is_drawn_without_time_to_draw_it_before_the_game_frame) {
  tween_pacer p;

  TweenPacerReset(&p);
  ASSERT_TRUE(TweenFrameDue(&p, 18, 34, 60, 10));
  ASSERT_FALSE(TweenFrameDue(&p, 18, 34, 60, 16)); /* it would end when the game frame is due */
}

UTEST(tween_pacing, a_longer_game_frame_has_more_frames_between) {
  tween_pacer p;

  TweenPacerReset(&p);
  TweenPacerDrew(&p, 18, 60);
  ASSERT_TRUE(TweenFrameDue(&p, 35, 51, 60, 0)); /* the intro's 3-vblank frames: slot 2 is 34.6 ticks in */
}

UTEST(tween_pacing, at_30_fps_no_frames_are_drawn_between_game_frames) {
  tween_pacer p;
  int i;

  TweenPacerReset(&p);
  for (i = 0; i < 60; i++)
    ASSERT_EQ(1, DrawGameFrame(&p, 34, 30));
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
