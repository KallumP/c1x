#include <string.h>
#include "utest.h"
#include "globals.h"
#include "pad.h"
#include "pc/boxhud.h"
#include "pc/coop.h"
#include "pc/pad.h"
#include "pc/tween.h"

extern pad pads[2];
extern gool_handle handles[8];

static void UsePlayerSlots(gool_object *slots) {
  int idx;

  for (idx=0;idx<GOOL_PLAYER_COUNT;idx++)
    players[idx] = &slots[idx];
}

UTEST(coop, player_two_joins_a_level_when_two_players_is_on) {
  ASSERT_TRUE(CoopPlayerTwoJoins(1, 0, 0));
}

UTEST(coop, player_two_stays_out_when_two_players_is_off) {
  ASSERT_FALSE(CoopPlayerTwoJoins(0, 0, 0));
}

UTEST(coop, player_two_stays_off_the_title_screen) {
  ASSERT_FALSE(CoopPlayerTwoJoins(1, 1, 0));
}

UTEST(coop, player_two_stays_out_of_a_demo) {
  ASSERT_FALSE(CoopPlayerTwoJoins(1, 0, 1));
}

static vec one_spot = { 0x10000, 0x20000, 0x30000 }; /* where player one stands */
static int32_t floor_ends_x; /* FloorUpTo's floor reaches this far along x */
static int floor_checks;     /* how many spots NoFloor was asked about */

static int FloorEverywhere(vec *trans) {
  return 1;
}

static int FloorUpTo(vec *trans) {
  return trans->x <= floor_ends_x;
}

static int NoFloor(vec *trans) {
  floor_checks++;
  return 0;
}

UTEST(coop, player_two_starts_two_boxes_beside_player_one) {
  vec spot = CoopSpawnBeside(one_spot, FloorEverywhere);

  ASSERT_EQ(one_spot.x + COOP_BESIDE_DISTANCE, spot.x);
  ASSERT_EQ(one_spot.y, spot.y);
  ASSERT_EQ(one_spot.z, spot.z);
}

UTEST(coop, with_no_floor_two_boxes_away_player_two_starts_half_a_box_nearer) {
  floor_ends_x = one_spot.x + COOP_BESIDE_DISTANCE - 1;
  ASSERT_EQ(one_spot.x + COOP_BESIDE_DISTANCE - COOP_BESIDE_STEP,
    CoopSpawnBeside(one_spot, FloorUpTo).x);
}

UTEST(coop, player_two_starts_at_the_furthest_spot_with_floor) {
  floor_ends_x = one_spot.x + COOP_BESIDE_STEP;
  ASSERT_EQ(one_spot.x + COOP_BESIDE_STEP, CoopSpawnBeside(one_spot, FloorUpTo).x);
}

UTEST(coop, with_no_floor_beside_him_player_two_starts_on_player_ones_spot) {
  vec spot = CoopSpawnBeside(one_spot, NoFloor);

  ASSERT_EQ(one_spot.x, spot.x);
  ASSERT_EQ(one_spot.y, spot.y);
  ASSERT_EQ(one_spot.z, spot.z);
}

UTEST(coop, player_ones_own_spot_isnt_checked_for_floor) {
  floor_checks = 0;
  CoopSpawnBeside(one_spot, NoFloor);
  ASSERT_EQ(COOP_BESIDE_DISTANCE / COOP_BESIDE_STEP, floor_checks);
}

UTEST(coop, each_player_slot_has_its_player_index) {
  gool_object slots[GOOL_PLAYER_COUNT];
  int idx;

  UsePlayerSlots(slots);
  for (idx=0;idx<GOOL_PLAYER_COUNT;idx++)
    ASSERT_EQ(idx, CoopPlayerIndex(&slots[idx]));
}

UTEST(coop, an_object_outside_the_player_slots_is_not_a_player) {
  gool_object slots[GOOL_PLAYER_COUNT], other;

  UsePlayerSlots(slots);
  ASSERT_EQ(COOP_NOT_A_PLAYER, CoopPlayerIndex(&other));
}

UTEST(coop, a_player_is_not_in_play_while_their_slot_is_empty) {
  gool_object slots[GOOL_PLAYER_COUNT];

  UsePlayerSlots(slots);
  slots[COOP_PLAYER_TWO].handle.type = 0;
  ASSERT_FALSE(CoopPlayerInPlay(COOP_PLAYER_TWO));
}

UTEST(coop, a_player_is_in_play_while_their_slot_is_in_use) {
  gool_object slots[GOOL_PLAYER_COUNT];

  UsePlayerSlots(slots);
  slots[COOP_PLAYER_TWO].handle.type = 1;
  ASSERT_TRUE(CoopPlayerInPlay(COOP_PLAYER_TWO));
}

UTEST(coop, each_player_has_a_tween_slot_past_the_objects_and_before_the_camera) {
  int idx;

  for (idx=0;idx<GOOL_PLAYER_COUNT;idx++) {
    ASSERT_EQ(GOOL_OBJECT_COUNT + idx, CoopPlayerTweenSlot(idx));
    ASSERT_LT(CoopPlayerTweenSlot(idx), TWEEN_CAMERA_SLOT);
  }
}

UTEST(coop, every_player_takes_the_zone_player_colours) {
  gool_object slots[GOOL_PLAYER_COUNT];
  zone_header header;
  gool_colors *colors;
  int idx;

  UsePlayerSlots(slots);
  for (idx=0;idx<GOOL_PLAYER_COUNT;idx++) {
    colors = CoopZoneColors(&slots[idx], &header);
    ASSERT_TRUE(&header.player_colors == colors);
  }
}

UTEST(coop, other_objects_take_the_zone_object_colours) {
  gool_object slots[GOOL_PLAYER_COUNT], other;
  zone_header header;

  UsePlayerSlots(slots);
  ASSERT_TRUE(&header.object_colors == CoopZoneColors(&other, &header));
}

UTEST(coop, each_player_reads_their_own_pad) {
  gool_object slots[GOOL_PLAYER_COUNT];
  int idx;

  UsePlayerSlots(slots);
  for (idx=0;idx<GOOL_PLAYER_COUNT;idx++)
    ASSERT_EQ(idx, CoopObjectPadPort(&slots[idx]));
}

UTEST(coop, other_objects_read_pad_one) {
  gool_object slots[GOOL_PLAYER_COUNT], other;

  UsePlayerSlots(slots);
  ASSERT_EQ(0, CoopObjectPadPort(&other));
}

/* both players in play, hud is a counter in the hud's list, and only player two
   holds triangle */
static void PlayerTwoHoldsTriangle(gool_object *slots, gool_object *hud) {
  UsePlayerSlots(slots);
  slots[0].handle.type = 1;
  slots[COOP_PLAYER_TWO].handle.type = 1;
  hud->handle.subtype = GOOL_OBJECT_SUBTYPE;
  hud->parent = (gool_object*)&handles[HUD_HANDLE];
  memset(pads, 0, sizeof(pads));
  pads[COOP_PLAYER_TWO].held = PAD_TRIANGLE;
}

UTEST(coop, the_hud_sees_a_button_player_two_holds) {
  gool_object slots[GOOL_PLAYER_COUNT], hud;

  PlayerTwoHoldsTriangle(slots, &hud);
  ASSERT_EQ(PAD_TRIANGLE, CoopObjectPad(&hud).held);
}

UTEST(coop, a_part_of_a_hud_counter_sees_a_button_player_two_holds) {
  gool_object slots[GOOL_PLAYER_COUNT], hud, digits;

  PlayerTwoHoldsTriangle(slots, &hud);
  digits.handle.subtype = GOOL_OBJECT_SUBTYPE;
  digits.parent = &hud;
  ASSERT_EQ(PAD_TRIANGLE, CoopObjectPad(&digits).held);
}

UTEST(coop, an_object_in_another_list_is_not_on_the_hud) {
  gool_object enemy;

  enemy.handle.subtype = GOOL_OBJECT_SUBTYPE;
  enemy.parent = (gool_object*)&handles[3];
  ASSERT_FALSE(CoopObjectIsOnHud(&enemy));
}

UTEST(coop, the_hud_ignores_the_pad_of_a_player_out_of_play) {
  gool_object slots[GOOL_PLAYER_COUNT], hud;

  PlayerTwoHoldsTriangle(slots, &hud);
  slots[COOP_PLAYER_TWO].handle.type = 0;
  ASSERT_EQ(0, CoopObjectPad(&hud).held);
}

UTEST(coop, other_objects_dont_see_player_twos_buttons) {
  gool_object slots[GOOL_PLAYER_COUNT], hud, other;

  PlayerTwoHoldsTriangle(slots, &hud);
  other.parent = 0;
  ASSERT_EQ(0, CoopObjectPad(&other).held);
}

/* player one at the origin, player two a box to the right; both in play */
static void PlacePlayersApart(gool_object *slots) {
  UsePlayerSlots(slots);
  slots[0].handle.type = 1;
  slots[0].trans = (vec){ 0, 0, 0 };
  slots[COOP_PLAYER_TWO].handle.type = 1;
  slots[COOP_PLAYER_TWO].trans = (vec){ 0x19000, 0, 0 };
}

UTEST(coop, the_nearest_player_is_player_two_beside_him) {
  gool_object slots[GOOL_PLAYER_COUNT];
  vec beside_two = { 0x20000, 0, 0 };

  PlacePlayersApart(slots);
  ASSERT_TRUE(&slots[COOP_PLAYER_TWO] == CoopNearestPlayer(&beside_two));
}

UTEST(coop, the_nearest_player_is_player_one_beside_him) {
  gool_object slots[GOOL_PLAYER_COUNT];
  vec beside_one = { -0x8000, 0, 0 };

  PlacePlayersApart(slots);
  ASSERT_TRUE(&slots[0] == CoopNearestPlayer(&beside_one));
}

UTEST(coop, a_player_out_of_play_is_never_the_nearest) {
  gool_object slots[GOOL_PLAYER_COUNT];
  vec beside_two = { 0x20000, 0, 0 };

  PlacePlayersApart(slots);
  slots[COOP_PLAYER_TWO].handle.type = 0;
  ASSERT_TRUE(&slots[0] == CoopNearestPlayer(&beside_two));
}

UTEST(coop, the_nearest_player_is_player_one_when_no_one_is_in_play) {
  gool_object slots[GOOL_PLAYER_COUNT];
  vec beside_two = { 0x20000, 0, 0 };

  PlacePlayersApart(slots);
  slots[0].handle.type = 0;
  slots[COOP_PLAYER_TWO].handle.type = 0;
  ASSERT_TRUE(&slots[0] == CoopNearestPlayer(&beside_two));
}

UTEST(coop, an_object_after_player_one_turns_to_a_nearer_player_two) {
  gool_object slots[GOOL_PLAYER_COUNT], enemy;

  PlacePlayersApart(slots);
  enemy.trans = (vec){ 0x20000, 0, 0 };
  enemy.player = &slots[0];
  CoopAimAtNearestPlayer(&enemy);
  ASSERT_TRUE(&slots[COOP_PLAYER_TWO] == enemy.player);
}

UTEST(coop, an_object_within_range_of_player_one_is_near_a_player) {
  gool_object slots[GOOL_PLAYER_COUNT], box;

  PlacePlayersApart(slots);
  box.trans = (vec){ -COOP_NEAR_RANGE_XZ, 0, 0 };
  ASSERT_TRUE(CoopObjectNearAnyPlayer(&box));
}

UTEST(coop, an_object_within_range_of_only_player_two_is_near_a_player) {
  gool_object slots[GOOL_PLAYER_COUNT], box;

  PlacePlayersApart(slots);
  box.trans = (vec){ 0x19000 + COOP_NEAR_RANGE_XZ, 0, 0 };
  ASSERT_TRUE(CoopObjectNearAnyPlayer(&box));
}

UTEST(coop, an_object_out_of_range_of_every_player_is_near_no_one) {
  gool_object slots[GOOL_PLAYER_COUNT], box;

  PlacePlayersApart(slots);
  box.trans = (vec){ 0, COOP_NEAR_RANGE_Y + 1, 0 };
  ASSERT_FALSE(CoopObjectNearAnyPlayer(&box));
}

UTEST(coop, an_object_near_no_one_has_its_bound_marked_invalid) {
  gool_object slots[GOOL_PLAYER_COUNT], box;

  PlacePlayersApart(slots);
  box.trans = (vec){ 0, COOP_NEAR_RANGE_Y + 1, 0 };
  box.status_a = 0;
  CoopObjectNearAnyPlayer(&box);
  ASSERT_TRUE(box.status_a & GOOL_FLAG_LBOUND_INVALID);
}

UTEST(coop, an_object_near_only_player_two_keeps_its_bound_valid) {
  gool_object slots[GOOL_PLAYER_COUNT], box;

  PlacePlayersApart(slots);
  box.trans = (vec){ 0x19000 + COOP_NEAR_RANGE_XZ, 0, 0 };
  box.status_a = 0;
  CoopObjectNearAnyPlayer(&box);
  ASSERT_FALSE(box.status_a & GOOL_FLAG_LBOUND_INVALID);
}

/* both players in play and drawn on frame 5 */
static void DrawBothPlayers(gool_object *slots) {
  PlacePlayersApart(slots);
  slots[0].anim_stamp = 5;
  slots[COOP_PLAYER_TWO].anim_stamp = 5;
}

UTEST(coop, an_object_drawn_the_same_frame_as_a_player_can_touch_them) {
  gool_object slots[GOOL_PLAYER_COUNT], box;

  DrawBothPlayers(slots);
  box.anim_stamp = 5;
  ASSERT_TRUE(CoopObjectCanTouchPlayer(&box, COOP_PLAYER_TWO));
}

UTEST(coop, an_object_drawn_on_another_frame_cant_touch_a_player) {
  gool_object slots[GOOL_PLAYER_COUNT], box;

  DrawBothPlayers(slots);
  box.anim_stamp = 4;
  ASSERT_FALSE(CoopObjectCanTouchPlayer(&box, COOP_PLAYER_TWO));
}

UTEST(coop, an_object_cant_touch_a_player_out_of_play) {
  gool_object slots[GOOL_PLAYER_COUNT], box;

  DrawBothPlayers(slots);
  slots[COOP_PLAYER_TWO].handle.type = 0;
  box.anim_stamp = 5;
  ASSERT_FALSE(CoopObjectCanTouchPlayer(&box, COOP_PLAYER_TWO));
}

UTEST(coop, the_players_cant_touch_each_other) {
  gool_object slots[GOOL_PLAYER_COUNT];

  DrawBothPlayers(slots);
  ASSERT_FALSE(CoopObjectCanTouchPlayer(&slots[0], COOP_PLAYER_TWO));
}

UTEST(coop, an_object_whose_player_link_isnt_a_player_keeps_it) {
  gool_object slots[GOOL_PLAYER_COUNT], fruit, target;

  PlacePlayersApart(slots);
  fruit.trans = (vec){ 0x20000, 0, 0 };
  fruit.player = &target;
  CoopAimAtNearestPlayer(&fruit);
  ASSERT_TRUE(&target == fruit.player);
}

/* his own death script would save where he died as everyone's checkpoint */
UTEST(coop, player_two_doesnt_save_the_level_state) {
  gool_object slots[GOOL_PLAYER_COUNT];

  UsePlayerSlots(slots);
  ASSERT_FALSE(CoopMaySaveLevelState(&slots[COOP_PLAYER_TWO]));
}

UTEST(coop, player_one_saves_the_level_state) {
  gool_object slots[GOOL_PLAYER_COUNT];

  UsePlayerSlots(slots);
  ASSERT_TRUE(CoopMaySaveLevelState(&slots[0]));
}

UTEST(coop, other_objects_save_the_level_state) {
  gool_object slots[GOOL_PLAYER_COUNT], checkpoint;

  UsePlayerSlots(slots);
  ASSERT_TRUE(CoopMaySaveLevelState(&checkpoint));
}

#define FAR_AHEAD        0x80000 /* how far apart the two players are */
#define FRAMES_TO_SETTLE 200     /* more than enough: FAR_AHEAD eases out in about 85 */

/* the aim the frame the camera, settled on a player at from, changes to one at to */
static vec AimAfterChange(vec from, vec to) {
  coop_camera camera = { 0 };
  gool_object before, after;

  before.trans = from;
  after.trans = to;
  CoopCameraStep(&camera, &before);
  return CoopCameraStep(&camera, &after);
}

UTEST(coop, the_camera_aims_at_the_first_player_it_follows_at_once) {
  coop_camera camera = { 0 };
  gool_object player;
  vec aim;

  player.trans = (vec){ 0x12345, 0x6789, -0x4000 };
  aim = CoopCameraStep(&camera, &player);
  ASSERT_EQ(player.trans.x, aim.x);
  ASSERT_EQ(player.trans.y, aim.y);
  ASSERT_EQ(player.trans.z, aim.z);
}

UTEST(coop, the_camera_stays_on_a_player_who_moves) {
  coop_camera camera = { 0 };
  gool_object player;
  vec aim;

  player.trans = (vec){ 0x12345, 0x6789, -0x4000 };
  CoopCameraStep(&camera, &player);
  player.trans = (vec){ 0x20000, 0x7000, -0x9000 };
  aim = CoopCameraStep(&camera, &player);
  ASSERT_EQ(player.trans.x, aim.x);
  ASSERT_EQ(player.trans.y, aim.y);
  ASSERT_EQ(player.trans.z, aim.z);
}

UTEST(coop, the_frame_its_player_changes_the_camera_moves_an_eighth_of_the_way_across) {
  vec from = { 0x10000, 0, 0 }, to = { 0x10000 + FAR_AHEAD, 0, 0 };

  ASSERT_EQ(from.x + FAR_AHEAD / COOP_CAMERA_EASE, AimAfterChange(from, to).x);
}

UTEST(coop, the_frame_its_player_changes_the_camera_moves_an_eighth_of_the_way_down) {
  vec from = { 0, 0x10000 + FAR_AHEAD, 0 }, to = { 0, 0x10000, 0 };

  ASSERT_EQ(from.y - FAR_AHEAD / COOP_CAMERA_EASE, AimAfterChange(from, to).y);
}

UTEST(coop, the_frame_its_player_changes_the_camera_moves_an_eighth_of_the_way_in) {
  vec from = { 0, 0, 0x10000 }, to = { 0, 0, 0x10000 + FAR_AHEAD };

  ASSERT_EQ(from.z + FAR_AHEAD / COOP_CAMERA_EASE, AimAfterChange(from, to).z);
}

UTEST(coop, the_camera_closes_an_eighth_of_what_is_left_each_frame) {
  coop_camera camera = { 0 };
  gool_object before, after;
  int32_t left;
  vec aim;

  before.trans = (vec){ 0x10000, 0, 0 };
  after.trans = (vec){ 0x10000 + FAR_AHEAD, 0, 0 };
  CoopCameraStep(&camera, &before);
  CoopCameraStep(&camera, &after);
  aim = CoopCameraStep(&camera, &after);
  left = FAR_AHEAD - FAR_AHEAD / COOP_CAMERA_EASE; /* after the first frame */
  left -= left / COOP_CAMERA_EASE;
  ASSERT_EQ(after.trans.x - left, aim.x);
}

UTEST(coop, the_camera_reaches_the_player_it_changed_to) {
  coop_camera camera = { 0 };
  gool_object before, after;
  vec aim;
  int frame;

  before.trans = (vec){ 0x10000, 0, 0 };
  after.trans = (vec){ 0x10000 + FAR_AHEAD, 0, 0 };
  CoopCameraStep(&camera, &before);
  for (frame=0;frame<FRAMES_TO_SETTLE;frame++)
    aim = CoopCameraStep(&camera, &after);
  ASSERT_EQ(after.trans.x, aim.x);
}

UTEST(coop, a_lag_too_small_to_ease_is_closed_at_once) {
  vec from = { 0x10000, 0, 0 }, to = { 0x10000 + COOP_CAMERA_EASE - 1, 0, 0 };

  ASSERT_EQ(to.x, AimAfterChange(from, to).x);
}

UTEST(coop, the_smallest_lag_that_eases_closes_by_one) {
  vec from = { 0x10000, 0, 0 }, to = { 0x10000 + COOP_CAMERA_EASE, 0, 0 };

  ASSERT_EQ(from.x + 1, AimAfterChange(from, to).x);
}

UTEST(coop, a_change_mid_ease_starts_from_where_the_camera_aimed) {
  coop_camera camera = { 0 };
  gool_object one, two;
  int32_t left;
  vec mid, aim;

  one.trans = (vec){ 0x10000, 0, 0 };
  two.trans = (vec){ 0x10000 + FAR_AHEAD, 0, 0 };
  CoopCameraStep(&camera, &one);
  mid = CoopCameraStep(&camera, &two); /* an eighth of the way to player two */
  aim = CoopCameraStep(&camera, &one);
  left = mid.x - one.trans.x;
  ASSERT_EQ(one.trans.x + left - left / COOP_CAMERA_EASE, aim.x);
}

UTEST(coop, a_reset_camera_aims_straight_at_the_player_it_follows) {
  coop_camera camera = { 0 };
  gool_object before, after, placed;
  vec aim;

  before.trans = (vec){ 0x10000, 0, 0 };
  after.trans = (vec){ 0x10000 + FAR_AHEAD, 0, 0 };
  placed.trans = (vec){ 0x1000, 0x2000, 0x3000 };
  CoopCameraStep(&camera, &before);
  CoopCameraStep(&camera, &after); /* mid-ease */
  CoopCameraReset(&camera);
  aim = CoopCameraStep(&camera, &placed);
  ASSERT_EQ(placed.trans.x, aim.x);
}

UTEST(coop, with_one_player_the_camera_follows_player_one) {
  coop_camera camera = { 0 };
  gool_object slots[GOOL_PLAYER_COUNT];
  vec beside_two = { 0x20000, 0, 0 };

  PlacePlayersApart(slots);
  slots[COOP_PLAYER_TWO].handle.type = 0;
  CoopCameraAim(&camera, &beside_two);
  ASSERT_TRUE(&slots[0] == camera.followed);
}

UTEST(coop, with_one_player_the_camera_aims_at_player_one_at_once) {
  coop_camera camera = { 0 };
  gool_object slots[GOOL_PLAYER_COUNT];
  vec beside_one = { -0x8000, 0, 0 }, beside_two = { 0x20000, 0, 0 };
  vec aim;

  PlacePlayersApart(slots);
  slots[0].trans.x = -0x4000;
  CoopCameraAim(&camera, &beside_one);
  CoopCameraAim(&camera, &beside_two); /* easing over to player two */
  slots[COOP_PLAYER_TWO].handle.type = 0;
  aim = CoopCameraAim(&camera, &beside_two);
  ASSERT_EQ(slots[0].trans.x, aim.x);
}

UTEST(coop, with_two_players_the_camera_follows_the_one_nearest_it) {
  coop_camera camera = { 0 };
  gool_object slots[GOOL_PLAYER_COUNT];
  vec beside_two = { 0x20000, 0, 0 };

  PlacePlayersApart(slots);
  CoopCameraAim(&camera, &beside_two);
  ASSERT_TRUE(&slots[COOP_PLAYER_TWO] == camera.followed);
}

UTEST(coop, with_two_players_the_camera_eases_over_when_the_nearest_changes) {
  coop_camera camera = { 0 };
  gool_object slots[GOOL_PLAYER_COUNT];
  vec beside_one = { -0x8000, 0, 0 }, beside_two = { 0x20000, 0, 0 };
  vec aim;

  PlacePlayersApart(slots);
  CoopCameraAim(&camera, &beside_one);
  aim = CoopCameraAim(&camera, &beside_two);
  ASSERT_EQ(slots[COOP_PLAYER_TWO].trans.x / COOP_CAMERA_EASE, aim.x);
}

UTEST(coop, a_frame_with_one_player_ends_the_ease_for_when_two_play_again) {
  coop_camera camera = { 0 };
  gool_object slots[GOOL_PLAYER_COUNT];
  vec beside_one = { -0x8000, 0, 0 }, beside_two = { 0x20000, 0, 0 };
  vec aim;

  PlacePlayersApart(slots);
  CoopCameraAim(&camera, &beside_two);
  CoopCameraAim(&camera, &beside_one); /* easing over to player one */
  slots[COOP_PLAYER_TWO].handle.type = 0;
  CoopCameraAim(&camera, &beside_one);
  slots[COOP_PLAYER_TWO].handle.type = 1;
  aim = CoopCameraAim(&camera, &beside_one);
  ASSERT_EQ(slots[0].trans.x, aim.x);
}

UTEST(coop, the_camera_eases_from_player_one_to_a_player_two_who_joins_nearer_it) {
  coop_camera camera = { 0 };
  gool_object slots[GOOL_PLAYER_COUNT];
  vec beside_two = { 0x20000, 0, 0 };
  int32_t apart;
  vec aim;

  PlacePlayersApart(slots);
  slots[0].trans.x = -0x4000;
  slots[COOP_PLAYER_TWO].handle.type = 0;
  CoopCameraAim(&camera, &beside_two);
  slots[COOP_PLAYER_TWO].handle.type = 1;
  aim = CoopCameraAim(&camera, &beside_two);
  apart = slots[COOP_PLAYER_TWO].trans.x - slots[0].trans.x;
  ASSERT_EQ(slots[0].trans.x + apart / COOP_CAMERA_EASE, aim.x);
}
