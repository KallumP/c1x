#include "utest.h"
#include "pc/coop.h"
#include "pc/tween.h"

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
