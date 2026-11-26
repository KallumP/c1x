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

UTEST(coop, player_two_starts_beside_player_one) {
  vec lead = { 0x10000, 0x20000, 0x30000 };
  vec beside = CoopBesideLead(lead);

  ASSERT_EQ(lead.x + COOP_BESIDE_DISTANCE, beside.x);
  ASSERT_EQ(lead.y, beside.y);
  ASSERT_EQ(lead.z, beside.z);
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

#define FAR_AHEAD 0x80000 /* where the new lead is, along x */

UTEST(coop, the_camera_aims_at_a_lead_that_stays_the_lead) {
  coop_camera camera = { 0 };
  gool_object lead;
  vec subject;

  lead.trans = (vec){ 0x12345, 0x6789, -0x4000 };
  CoopCameraSubject(&camera, &lead);
  subject = CoopCameraSubject(&camera, &lead);
  ASSERT_EQ(lead.trans.x, subject.x);
  ASSERT_EQ(lead.trans.y, subject.y);
  ASSERT_EQ(lead.trans.z, subject.z);
}

UTEST(coop, the_camera_starts_from_the_old_lead_when_the_lead_changes) {
  coop_camera camera = { 0 };
  gool_object old_lead, new_lead;
  vec subject;

  old_lead.trans = (vec){ 0, 0, 0 };
  new_lead.trans = (vec){ FAR_AHEAD, 0, 0 };
  CoopCameraSubject(&camera, &old_lead);
  subject = CoopCameraSubject(&camera, &new_lead);
  ASSERT_EQ(FAR_AHEAD / COOP_CAMERA_EASE, subject.x); /* 1/COOP_CAMERA_EASE of the way */
}

UTEST(coop, the_camera_reaches_a_new_lead) {
  coop_camera camera = { 0 };
  gool_object old_lead, new_lead;
  vec subject;
  int frame;

  old_lead.trans = (vec){ 0, 0, 0 };
  new_lead.trans = (vec){ FAR_AHEAD, 0, 0 };
  CoopCameraSubject(&camera, &old_lead);
  for (frame=0;frame<200;frame++)
    subject = CoopCameraSubject(&camera, &new_lead);
  ASSERT_EQ(FAR_AHEAD, subject.x);
}
