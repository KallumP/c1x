#include "utest.h"
#include "pc/tween.h"

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

UTEST(tween, lerp_ang_lerps_each_angle) {
  ang a = { .x = 0xF00, .y = 0, .z = 0x100 };
  ang b = { .x = 0x100, .y = 0x200, .z = 0x100 };
  ang out;

  TweenLerpAng(&a, &b, TWEEN_ONE/2, &out);
  ASSERT_EQ(0x000, out.x & 0xFFF);
  ASSERT_EQ(0x100, out.y);
  ASSERT_EQ(0x100, out.z);
}
