#include <string.h>
#include "utest.h"
#include "pc/card.h"

/* a save with something in every field the game keeps */
static card_save SomeSave(void) {
  card_save save;

  memset(&save, 0, sizeof(save));
  save.progress = CardProgress(1, 2, 7);
  save.level_count = 7;
  save.init_life_count = 4 << 8;
  save.sfx_vol = 255;
  save.mus_vol = 200;
  save.item_pool1 = 0x12345678;
  save.item_pool2 = 0x9abcdef0;
  return save;
}

UTEST(card, a_save_is_one_block) {
  ASSERT_EQ((size_t)CARD_BLOCK_SIZE, sizeof(card_save));
}

UTEST(card, a_sealed_save_is_valid) {
  card_save save;

  save = SomeSave();
  CardSaveSeal(&save);
  ASSERT_TRUE(CardSaveIsValid(&save));
}

UTEST(card, a_save_changed_after_its_sealed_isnt_valid) {
  card_save save;

  save = SomeSave();
  CardSaveSeal(&save);
  save.level_count = 30;
  ASSERT_FALSE(CardSaveIsValid(&save));
}

UTEST(card, an_empty_block_isnt_a_valid_save) {
  card_save save;

  memset(&save, 0, sizeof(save));
  ASSERT_FALSE(CardSaveIsValid(&save));
}

UTEST(card, saves_that_differ_have_different_checksums) {
  card_save one, other;

  one = SomeSave();
  other = SomeSave();
  other.item_pool1 ^= 1;
  ASSERT_NE(CardChecksum((const uint8_t*)&one, sizeof(one)), CardChecksum((const uint8_t*)&other, sizeof(other)));
}

UTEST(card, progress_has_the_level_count_low_then_gems_then_keys) {
  ASSERT_EQ(7u, CardProgress(0, 0, 7));
  ASSERT_EQ((2u << 5) | 7u, CardProgress(0, 2, 7));
  ASSERT_EQ((1u << 10) | (2u << 5) | 7u, CardProgress(1, 2, 7));
}

/* a slot's info as the game's screens read it: bit 0 it's been read, bits 1-2 its 3 icons,
   bit 3 it's a crash save, its progress from bit 5, and bit 17 it isn't damaged */
UTEST(card, a_slots_info_says_its_a_crash_save_with_its_progress) {
  ASSERT_EQ(0x20000u | (7u << 5) | 8u | (3u << 1) | 1u, CardSlotInfo(7));
}

UTEST(card, a_slots_name_is_crash_and_its_percent_in_capitals) {
  char name[32];

  CardSlotName(name, sizeof(name), 12);
  ASSERT_STREQ("CRASH (12%)", name);
  CardSlotName(name, sizeof(name), 100);
  ASSERT_STREQ("CRASH (100%)", name);
}

UTEST(card, a_slots_name_is_cut_to_fit) {
  char name[8];

  CardSlotName(name, sizeof(name), 12);
  ASSERT_STREQ("CRASH (", name);
}
