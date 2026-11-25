#include "utest.h"
#include "pc/coop.h"
#include "pc/tween.h"

UTEST(coop, player_two_starts_beside_player_one) {
  vec lead = { 0x10000, 0x20000, 0x30000 };
  vec beside = CoopBesideLead(lead);

  ASSERT_EQ(lead.x + COOP_BESIDE_DISTANCE, beside.x);
  ASSERT_EQ(lead.y, beside.y);
  ASSERT_EQ(lead.z, beside.z);
}

UTEST(coop, each_player_slot_has_its_player_index) {
  gool_object slots[GOOL_PLAYER_COUNT];
  int i;

  for (i=0;i<GOOL_PLAYER_COUNT;i++) { players[i] = &slots[i]; }
  for (i=0;i<GOOL_PLAYER_COUNT;i++) { ASSERT_EQ(i, CoopPlayerIndex(&slots[i])); }
}

UTEST(coop, an_object_outside_the_player_slots_is_not_a_player) {
  gool_object slots[GOOL_PLAYER_COUNT], other;
  int i;

  for (i=0;i<GOOL_PLAYER_COUNT;i++) { players[i] = &slots[i]; }
  ASSERT_EQ(COOP_NOT_A_PLAYER, CoopPlayerIndex(&other));
  ASSERT_FALSE(CoopIsPlayer(&other));
  ASSERT_TRUE(CoopIsPlayer(&slots[GOOL_PLAYER_COUNT-1]));
}

UTEST(coop, a_player_is_in_play_only_while_their_slot_is_in_use) {
  gool_object slots[GOOL_PLAYER_COUNT];
  int i;

  for (i=0;i<GOOL_PLAYER_COUNT;i++) { players[i] = &slots[i]; }
  slots[1].handle.type = 0;
  ASSERT_EQ(0, CoopPlayerInPlay(1));
  slots[1].handle.type = 1;
  ASSERT_EQ(1, CoopPlayerInPlay(1));
}

UTEST(coop, each_player_has_a_tween_slot_past_the_objects_and_before_the_camera) {
  int i;

  for (i=0;i<GOOL_PLAYER_COUNT;i++) {
    ASSERT_EQ(GOOL_OBJECT_COUNT + i, CoopPlayerTweenSlot(i));
    ASSERT_LT(CoopPlayerTweenSlot(i), TWEEN_CAMERA_SLOT);
  }
}
