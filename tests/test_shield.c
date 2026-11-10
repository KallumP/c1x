#include "utest.h"
#include "pc/shield.h"

#define WALKING_HEADING 0x200 /* any heading but a push's */

static vec at(int32_t x, int32_t y, int32_t z) {
  vec v;
  v.x = x; v.y = y; v.z = z;
  return v;
}

/* crash's motion just after a native's shield pushes him, the game's way: along x */
static vec pushed(int32_t sign) { return at(sign * SHIELD_PUSH_SPEED, 0, 0); }

UTEST(shield, a_push_moves_crash_along_x_at_the_shields_speed_facing_his_way) {
  vec walking = at(0x1000, 0, 0x2000);
  vec pushed_plus = pushed(1), pushed_minus = pushed(-1);

  ASSERT_TRUE(ShieldPushed(&walking, WALKING_HEADING, &pushed_plus, SHIELD_HEADING_PLUS_X));
  ASSERT_TRUE(ShieldPushed(&walking, WALKING_HEADING, &pushed_minus, SHIELD_HEADING_MINUS_X));
}

UTEST(shield, crash_moving_as_he_was_isnt_a_push) {
  vec before = pushed(1);

  ASSERT_FALSE(ShieldPushed(&before, SHIELD_HEADING_PLUS_X, &before, SHIELD_HEADING_PLUS_X));
}

UTEST(shield, other_motion_isnt_a_push) {
  vec walking = at(0x1000, 0, 0x2000);
  vec pushed_and_moving_in_z = at(SHIELD_PUSH_SPEED, 0, 0x100);
  vec too_slow = at(SHIELD_PUSH_SPEED / 2, 0, 0);
  vec pushed_plus = pushed(1);

  ASSERT_FALSE(ShieldPushed(&walking, WALKING_HEADING, &pushed_and_moving_in_z, SHIELD_HEADING_PLUS_X));
  ASSERT_FALSE(ShieldPushed(&walking, WALKING_HEADING, &too_slow, SHIELD_HEADING_PLUS_X));
  ASSERT_FALSE(ShieldPushed(&walking, WALKING_HEADING, &pushed_plus, SHIELD_HEADING_MINUS_X));
}

UTEST(shield, a_native_on_a_path_along_x_pushes_crash_away_along_x) {
  vec native = at(0, 0, 0), start = at(-1000, 0, 0), end = at(1000, 0, 0);
  vec way_plus, way_minus;

  way_plus = ShieldPushWay(&native, &(vec){ 300, 0, 50 }, &start, &end);
  way_minus = ShieldPushWay(&native, &(vec){ -300, 0, 50 }, &start, &end);

  ASSERT_TRUE(way_plus.x > 0 && way_plus.z == 0);
  ASSERT_TRUE(way_minus.x < 0 && way_minus.z == 0);
}

UTEST(shield, a_native_on_a_path_along_z_pushes_crash_away_along_z_from_either_side) {
  vec native = at(0, 0, 0), start = at(0, 0, 1000), end = at(0, 0, -1000);
  vec ahead, behind;

  ahead = ShieldPushWay(&native, &(vec){ 50, 0, 300 }, &start, &end);
  behind = ShieldPushWay(&native, &(vec){ 50, 0, -300 }, &start, &end);

  ASSERT_TRUE(ahead.z > 0 && ahead.x == 0);
  ASSERT_TRUE(behind.z < 0 && behind.x == 0);
}

UTEST(shield, a_native_on_a_slanted_path_pushes_crash_along_it) {
  vec native = at(0, 0, 0), start = at(-1000, 0, -1000), end = at(1000, 0, 1000);
  vec way = ShieldPushWay(&native, &(vec){ 300, 0, 200 }, &start, &end);

  ASSERT_TRUE(way.x > 0 && way.x == way.z);
}

UTEST(shield, a_native_whose_path_has_no_length_pushes_along_x) {
  vec native = at(0, 0, 0), spot = at(0, 0, 0);
  vec way = ShieldPushWay(&native, &(vec){ -300, 0, 900 }, &spot, &spot);

  ASSERT_TRUE(way.x < 0 && way.z == 0);
}
