#include "utest.h"
#include "pc/speed.h"

/* one game speed unit per second is 4096 position units per 1024 ticks */
#define UNITS(n) ((n)*4096)

UTEST(speed, standing_still_is_zero) {
  vec prev = { .x=UNITS(5), .y=0, .z=UNITS(7) };
  vec cur = prev;

  ASSERT_EQ(0u, SpeedMeasure(&prev, &cur, 34));
}

UTEST(speed, moving_100_units_in_1024_ticks_is_100) {
  vec prev = { .x=0, .y=0, .z=0 };
  vec cur = { .x=UNITS(100), .y=0, .z=0 };

  ASSERT_EQ(100u, SpeedMeasure(&prev, &cur, 1024));
}

UTEST(speed, combines_x_and_z) {
  vec prev = { .x=0, .y=0, .z=0 };
  vec cur = { .x=UNITS(30), .y=0, .z=UNITS(-40) };

  ASSERT_EQ(50u, SpeedMeasure(&prev, &cur, 1024));
}

UTEST(speed, divides_by_elapsed_ticks) {
  vec prev = { .x=0, .y=0, .z=0 };
  vec cur = { .x=UNITS(50), .y=0, .z=0 };

  ASSERT_EQ(100u, SpeedMeasure(&prev, &cur, 512));
}

UTEST(speed, ignores_vertical_movement) {
  vec prev = { .x=0, .y=0, .z=0 };
  vec cur = { .x=0, .y=UNITS(200), .z=0 };

  ASSERT_EQ(0u, SpeedMeasure(&prev, &cur, 1024));
}

UTEST(speed, zero_ticks_is_zero) {
  vec prev = { .x=0, .y=0, .z=0 };
  vec cur = { .x=UNITS(10), .y=0, .z=0 };

  ASSERT_EQ(0u, SpeedMeasure(&prev, &cur, 0));
}

UTEST(speed, large_moves_do_not_overflow) {
  vec prev = { .x=-0x40000000, .y=0, .z=-0x40000000 };
  vec cur = { .x=0x3FFFFFFF, .y=0, .z=0x3FFFFFFF };

  /* the whole int32 range along x and z: sqrt(2) * 0x7FFFFFFF = 3037000498 position units */
  ASSERT_EQ(3037000498u / UNITS(1), SpeedMeasure(&prev, &cur, 1024));
}

UTEST(speed_track, first_frame_of_an_object_is_zero) {
  speed_tracker t = { 0 };
  int crash;
  vec trans = { .x=UNITS(100), .y=0, .z=0 };

  ASSERT_EQ(0u, SpeedTrack(&t, &crash, &trans, 1024));
  ASSERT_EQ(0, t.x);
  ASSERT_EQ(0, t.y);
  ASSERT_EQ(0, t.z);
}

UTEST(speed_track, measures_movement_between_frames) {
  speed_tracker t = { 0 };
  int crash;
  vec frame1 = { .x=0, .y=0, .z=0 };
  vec frame2 = { .x=UNITS(10), .y=0, .z=0 };
  vec frame3 = { .x=UNITS(30), .y=0, .z=0 };

  SpeedTrack(&t, &crash, &frame1, 1024);
  ASSERT_EQ(10u, SpeedTrack(&t, &crash, &frame2, 1024));
  ASSERT_EQ(20u, SpeedTrack(&t, &crash, &frame3, 1024));
}

UTEST(speed_track, restarts_when_the_object_changes) {
  speed_tracker t = { 0 };
  int old_crash, new_crash;
  vec here = { .x=0, .y=0, .z=0 };
  vec far_away = { .x=UNITS(100), .y=0, .z=0 };

  SpeedTrack(&t, &old_crash, &here, 1024);
  ASSERT_EQ(0u, SpeedTrack(&t, &new_crash, &far_away, 1024));
}

UTEST(speed_track, no_object_is_zero_and_restarts) {
  speed_tracker t = { 0 };
  int crash;
  vec here = { .x=0, .y=0, .z=0 };
  vec moved = { .x=UNITS(30), .y=UNITS(5), .z=UNITS(-40) };
  vec far_away = { .x=UNITS(100), .y=0, .z=0 };

  SpeedTrack(&t, &crash, &here, 1024);
  SpeedTrack(&t, &crash, &moved, 1024);
  ASSERT_EQ(0u, SpeedTrack(&t, 0, 0, 1024));
  ASSERT_EQ(0, t.x);
  ASSERT_EQ(0, t.y);
  ASSERT_EQ(0, t.z);
  ASSERT_EQ(0u, SpeedTrack(&t, &crash, &far_away, 1024)); /* a first frame again */
  ASSERT_EQ(0, t.x);
  ASSERT_EQ(0, t.y);
  ASSERT_EQ(0, t.z);
}

UTEST(speed_track, teleport_is_not_counted_as_movement) {
  speed_tracker t = { 0 };
  int crash;
  vec checkpoint = { .x=0, .y=0, .z=0 };
  vec respawned = { .x=UNITS(SPEED_TELEPORT+1), .y=0, .z=0 };
  vec moved_on = { .x=UNITS(SPEED_TELEPORT+11), .y=0, .z=0 };

  SpeedTrack(&t, &crash, &checkpoint, 1024);
  ASSERT_EQ(0u, SpeedTrack(&t, &crash, &respawned, 1024));
  /* tracking carries on from the new position */
  ASSERT_EQ(10u, SpeedTrack(&t, &crash, &moved_on, 1024));
}

UTEST(speed_axis, negative_movement_is_negative) {
  ASSERT_EQ(-100, SpeedAxis(UNITS(100), 0, 1024));
}

UTEST(speed_axis, large_moves_do_not_overflow) {
  /* the whole int32 range, 0x7FFFFFFF position units */
  ASSERT_EQ(0x7FFFFFFF / UNITS(1), SpeedAxis(-0x40000000, 0x3FFFFFFF, 1024));
}

UTEST(speed_track, records_speed_along_each_axis) {
  speed_tracker t = { 0 };
  int crash;
  vec frame1 = { .x=0, .y=0, .z=0 };
  vec frame2 = { .x=UNITS(30), .y=UNITS(5), .z=UNITS(-40) };

  SpeedTrack(&t, &crash, &frame1, 1024);
  SpeedTrack(&t, &crash, &frame2, 1024);
  ASSERT_EQ(30, t.x);
  ASSERT_EQ(5, t.y);
  ASSERT_EQ(-40, t.z);
}

UTEST(speed_track, vertical_teleport_is_not_counted_as_movement) {
  speed_tracker t = { 0 };
  int crash;
  vec checkpoint = { .x=0, .y=0, .z=0 };
  vec respawned_above = { .x=UNITS(10), .y=UNITS(SPEED_TELEPORT+1), .z=0 };

  SpeedTrack(&t, &crash, &checkpoint, 1024);
  ASSERT_EQ(0u, SpeedTrack(&t, &crash, &respawned_above, 1024));
  ASSERT_EQ(0, t.x);
  ASSERT_EQ(0, t.y);
  ASSERT_EQ(0, t.z);
}
