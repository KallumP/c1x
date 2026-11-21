#include <string.h>
#include "utest.h"
#include <stdio.h>
#include "pc/card.h"
#include "test_files.h"

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

/* save files */

#define CARD_DIR "build/test_card"

/* an empty card folder */
static void FreshCard(void) {
  MakeFolder("build");
  MakeFolder(CARD_DIR);
  CardDeleteFiles(CARD_DIR);
  remove(CARD_DIR "/notes.txt");
}

/* a sealed save at a level count, written to file_name in the card folder as percent done */
static card_save WriteSave(const char *file_name, int level_count, int percent) {
  card_save save;

  save = SomeSave();
  save.level_count = level_count;
  CardSaveSeal(&save);
  CardFileWrite(CARD_DIR, file_name, &save, percent);
  return save;
}

/* how long the file at path is, or -1 if it isn't there */
static long FileLength(const char *path) {
  FILE *file;
  long length;

  file = fopen(path, "rb");
  if (!file) { return -1; }
  fseek(file, 0, SEEK_END);
  length = ftell(file);
  fclose(file);
  return length;
}

/* fills the block at index in the file at path with rubbish */
static void SpoilBlock(const char *path, int index) {
  uint8_t rubbish[CARD_BLOCK_SIZE];
  FILE *file;

  memset(rubbish, 0xa5, sizeof(rubbish));
  file = fopen(path, "r+b");
  if (!file) { return; }
  fseek(file, index * CARD_BLOCK_SIZE, SEEK_SET);
  fwrite(rubbish, 1, sizeof(rubbish), file);
  fclose(file);
}

UTEST(card_files, a_save_written_reads_back_the_same_with_its_slot_name) {
  card_save written, read;
  char slot_name[CARD_SLOT_NAME_SIZE];

  FreshCard();
  written = WriteSave("BASCUS-9490000123456", 7, 12);
  ASSERT_EQ(1, CardFileRead(CARD_DIR, "BASCUS-9490000123456", &read, slot_name, sizeof(slot_name)));
  ASSERT_EQ(0, memcmp(&written, &read, sizeof(read)));
  ASSERT_STREQ("CRASH (12%)", slot_name);
}

UTEST(card_files, a_save_file_is_a_header_three_icons_and_five_copies_long) {
  FreshCard();
  WriteSave("BASCUS-9490000123456", 7, 12);
  ASSERT_EQ((long)(CARD_FILE_BLOCKS * CARD_BLOCK_SIZE), FileLength(CARD_DIR "/BASCUS-9490000123456"));
}

UTEST(card_files, writing_a_save_makes_the_cards_folder) {
  card_save save, read;
  char slot_name[CARD_SLOT_NAME_SIZE];

  FreshCard();
  remove(CARD_DIR "/new/BASCUS-9490000123456");
  remove(CARD_DIR "/new");
  save = SomeSave();
  CardSaveSeal(&save);
  ASSERT_EQ(1, CardFileWrite(CARD_DIR "/new", "BASCUS-9490000123456", &save, 5));
  ASSERT_EQ(1, CardFileRead(CARD_DIR "/new", "BASCUS-9490000123456", &read, slot_name, sizeof(slot_name)));
}

UTEST(card_files, a_save_with_a_spoiled_copy_is_read_from_the_next) {
  card_save written, read;
  char slot_name[CARD_SLOT_NAME_SIZE];

  FreshCard();
  written = WriteSave("BASCUS-9490000123456", 7, 12);
  SpoilBlock(CARD_DIR "/BASCUS-9490000123456", 4); /* the first copy, after the header and icons */
  ASSERT_EQ(1, CardFileRead(CARD_DIR, "BASCUS-9490000123456", &read, slot_name, sizeof(slot_name)));
  ASSERT_EQ(0, memcmp(&written, &read, sizeof(read)));
}

UTEST(card_files, a_save_with_every_copy_spoiled_isnt_read) {
  card_save read;
  char slot_name[CARD_SLOT_NAME_SIZE];
  int i;

  FreshCard();
  WriteSave("BASCUS-9490000123456", 7, 12);
  for (i = 4; i < CARD_FILE_BLOCKS; i++) { SpoilBlock(CARD_DIR "/BASCUS-9490000123456", i); }
  ASSERT_EQ(0, CardFileRead(CARD_DIR, "BASCUS-9490000123456", &read, slot_name, sizeof(slot_name)));
}

UTEST(card_files, a_save_that_isnt_there_isnt_read) {
  card_save read;
  char slot_name[CARD_SLOT_NAME_SIZE];

  FreshCard();
  ASSERT_EQ(0, CardFileRead(CARD_DIR, "BASCUS-9490000123456", &read, slot_name, sizeof(slot_name)));
}

UTEST(card_files, a_cards_saves_are_listed_in_name_order) {
  char file_names[CARD_SLOT_MAX][CARD_FILE_NAME_SIZE];

  FreshCard();
  WriteSave("BASCUS-9490001222222", 3, 10);
  WriteSave("BASCUS-9490000111111", 2, 5);
  ASSERT_EQ(2, CardListFiles(CARD_DIR, file_names));
  ASSERT_STREQ("BASCUS-9490000111111", file_names[0]);
  ASSERT_STREQ("BASCUS-9490001222222", file_names[1]);
}

UTEST(card_files, only_save_files_are_listed) {
  char file_names[CARD_SLOT_MAX][CARD_FILE_NAME_SIZE];

  FreshCard();
  WriteSave("BASCUS-9490000111111", 2, 5);
  WriteWholeFile(CARD_DIR "/notes.txt", "not a save");
  ASSERT_EQ(1, CardListFiles(CARD_DIR, file_names));
}

UTEST(card_files, a_card_folder_that_isnt_there_has_no_saves) {
  char file_names[CARD_SLOT_MAX][CARD_FILE_NAME_SIZE];

  ASSERT_EQ(0, CardListFiles("build/no_such_card", file_names));
}

UTEST(card_files, a_card_lists_at_most_fifteen_saves) {
  char file_names[CARD_SLOT_MAX][CARD_FILE_NAME_SIZE];
  char file_name[CARD_FILE_NAME_SIZE];
  int i;

  FreshCard();
  for (i = 0; i < CARD_SLOT_MAX + 2; i++) {
    snprintf(file_name, sizeof(file_name), "BASCUS-94900%02d000000", i);
    WriteSave(file_name, 2, 5);
  }
  ASSERT_EQ(CARD_SLOT_MAX, CardListFiles(CARD_DIR, file_names));
}

UTEST(card_files, a_cards_first_save_is_numbered_0_with_its_id) {
  char file_name[CARD_FILE_NAME_SIZE];

  CardNextFileName(file_name, 0, 123456);
  ASSERT_STREQ("BASCUS-9490000123456", file_name);
}

UTEST(card_files, a_new_save_is_numbered_one_on_from_the_cards_last) {
  char file_name[CARD_FILE_NAME_SIZE];

  CardNextFileName(file_name, "BASCUS-9490003999999", 42);
  ASSERT_STREQ("BASCUS-9490004000042", file_name);
}

UTEST(card_files, deleting_a_cards_saves_leaves_its_other_files) {
  char file_names[CARD_SLOT_MAX][CARD_FILE_NAME_SIZE];

  FreshCard();
  WriteSave("BASCUS-9490000111111", 2, 5);
  WriteSave("BASCUS-9490001222222", 3, 10);
  WriteWholeFile(CARD_DIR "/notes.txt", "not a save");
  CardDeleteFiles(CARD_DIR);
  ASSERT_EQ(0, CardListFiles(CARD_DIR, file_names));
  ASSERT_EQ(10, FileLength(CARD_DIR "/notes.txt"));
}
