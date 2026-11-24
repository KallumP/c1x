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

/*
 * draw a game frame of frame_ticks and the frames between it that are due, a
 * tick at a time, noting the ticks each frame between was drawn at in
 * drawn_at (if given); returns the frames drawn, the game frame's own included
 */
static int DrawGameFrame(tween_pacer *p, int32_t frame_ticks, uint32_t rate, int32_t *drawn_at) {
  int32_t elapsed;
  int drawn;

  drawn = 1; /* the game frame's own */
  for (elapsed = 0; elapsed < frame_ticks; elapsed++) {
    if (TweenFrameDue(p, elapsed, frame_ticks, rate, 0)) {
      TweenPacerDrew(p, elapsed, frame_ticks, rate, 0);
      if (drawn_at) { drawn_at[drawn - 1] = elapsed; }
      drawn++;
    }
  }
  TweenPacerNextGameFrame(p, 0);
  return drawn;
}

UTEST(tween_pacing, a_game_frame_has_the_frame_rates_share_of_frames_rounded) {
  ASSERT_EQ(2, TweenFramesPerGameFrame(34, 60));  /* 1.97: 34 ticks is just under 1/30 s */
  ASSERT_EQ(4, TweenFramesPerGameFrame(34, 120));
  ASSERT_EQ(5, TweenFramesPerGameFrame(34, 144)); /* 4.72 */
  ASSERT_EQ(1, TweenFramesPerGameFrame(34, 30));
  ASSERT_EQ(3, TweenFramesPerGameFrame(51, 60));  /* the intro's 3-vblank frames */
}

UTEST(tween_pacing, a_game_frame_always_has_at_least_its_own_frame) {
  ASSERT_EQ(1, TweenFramesPerGameFrame(34, 10));
}

UTEST(tween_pacing, at_60_fps_the_frame_between_is_halfway_through_every_game_frame) {
  tween_pacer p;
  int32_t drawn_at[8];
  int i;

  TweenPacerReset(&p);
  for (i = 0; i < 100; i++) { /* it doesn't drift from one game frame to the next */
    ASSERT_EQ(2, DrawGameFrame(&p, 34, 60, drawn_at));
    ASSERT_EQ(17, drawn_at[0]);
  }
}

UTEST(tween_pacing, at_144_fps_the_frames_between_are_evenly_spaced) {
  tween_pacer p;
  int32_t drawn_at[8];

  TweenPacerReset(&p);
  ASSERT_EQ(5, DrawGameFrame(&p, 34, 144, drawn_at));
  ASSERT_EQ(7, drawn_at[0]); /* 6.8 ticks apart, each at or just after its time */
  ASSERT_EQ(14, drawn_at[1]);
  ASSERT_EQ(21, drawn_at[2]);
  ASSERT_EQ(28, drawn_at[3]);
}

UTEST(tween_pacing, a_frame_is_due_once_its_time_comes_round) {
  tween_pacer p;

  TweenPacerReset(&p);
  ASSERT_FALSE(TweenFrameDue(&p, 16, 34, 60, 0));
  ASSERT_TRUE(TweenFrameDue(&p, 17, 34, 60, 0));
  TweenPacerDrew(&p, 17, 34, 60, 0);
  ASSERT_FALSE(TweenFrameDue(&p, 20, 34, 60, 0)); /* already drawn */
}

UTEST(tween_pacing, a_late_frame_doesnt_make_up_the_frames_it_missed) {
  tween_pacer p;

  TweenPacerReset(&p);
  ASSERT_TRUE(TweenFrameDue(&p, 22, 34, 144, 0)); /* 7, 14 and 21 have all come round */
  TweenPacerDrew(&p, 22, 34, 144, 0);
  ASSERT_FALSE(TweenFrameDue(&p, 23, 34, 144, 0));
  ASSERT_TRUE(TweenFrameDue(&p, 28, 34, 144, 0));
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
  ASSERT_TRUE(TweenFrameDue(&p, 17, 34, 60, 10));
  ASSERT_FALSE(TweenFrameDue(&p, 17, 34, 60, 17)); /* it would end when the game frame is due */
}

UTEST(tween_pacing, a_longer_game_frame_has_more_frames_between) {
  tween_pacer p;
  int32_t drawn_at[8];

  TweenPacerReset(&p);
  ASSERT_EQ(3, DrawGameFrame(&p, 51, 60, drawn_at));
  ASSERT_EQ(17, drawn_at[0]);
  ASSERT_EQ(34, drawn_at[1]);
}

/* a game frame shown 1 tick into it, and frames between that take 5 ticks to show */
UTEST(tween_pacing, a_frame_between_starts_early_enough_to_be_shown_halfway) {
  tween_pacer p;

  TweenPacerReset(&p);
  TweenPacerNextGameFrame(&p, 1);
  ASSERT_FALSE(TweenFrameDue(&p, 12, 34, 60, 5));
  ASSERT_TRUE(TweenFrameDue(&p, 13, 34, 60, 5)); /* shown at 18: 17 after the game frame's own */
  TweenPacerDrew(&p, 13, 34, 60, 5);
  ASSERT_FALSE(TweenFrameDue(&p, 14, 34, 60, 5));
}

UTEST(tween_pacing, a_game_frame_shown_late_moves_its_frames_between_later) {
  tween_pacer p;

  TweenPacerReset(&p);
  TweenPacerNextGameFrame(&p, 4);
  ASSERT_FALSE(TweenFrameDue(&p, 20, 34, 60, 0));
  ASSERT_TRUE(TweenFrameDue(&p, 21, 34, 60, 0));
}

UTEST(tween_pacing, a_new_game_frame_starts_its_frames_between_afresh) {
  tween_pacer p;

  TweenPacerReset(&p);
  TweenPacerDrew(&p, 17, 34, 60, 0);
  TweenPacerNextGameFrame(&p, 0);
  ASSERT_TRUE(TweenFrameDue(&p, 17, 34, 60, 0));
}

UTEST(tween_pacing, at_30_fps_no_frames_are_drawn_between_game_frames) {
  tween_pacer p;
  int i;

  TweenPacerReset(&p);
  for (i = 0; i < 60; i++)
    ASSERT_EQ(1, DrawGameFrame(&p, 34, 30, 0));
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

#define TOKEN_BLINK 76800 /* the newest hud token blinks by jumping this far off screen and back */
#define TOKEN_FLIGHT 7620 /* a collected token flies about this far up the screen a game frame */

UTEST(tween_poses, a_screen_object_jumping_off_screen_is_not_tweened) {
  tween_pose before, now, out;

  TweenForgetAll();
  before = Pose(0, 0, 0x1000);
  now = Pose(TOKEN_BLINK, 0, 0x1000);
  TweenRecord(4, &before);
  TweenScreenPoseAt(4, &now, TWEEN_ONE/2, &out);
  ASSERT_EQ(TOKEN_BLINK, out.trans.x);
}

UTEST(tween_poses, a_screen_object_flying_up_the_screen_is_tweened) {
  tween_pose before, now, out;

  TweenForgetAll();
  before = Pose(0, 0, 0x1000);
  now = Pose(TOKEN_FLIGHT, 0, 0x1000);
  TweenRecord(4, &before);
  TweenScreenPoseAt(4, &now, TWEEN_ONE/2, &out);
  ASSERT_EQ(TOKEN_FLIGHT/2, out.trans.x);
}
