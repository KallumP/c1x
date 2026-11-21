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
  save._level_count = 7;
  save._init_life_count = 4 << 8;
  save._sfx_vol = 255;
  save._mus_vol = 200;
  save._item_pool1 = 0x12345678;
  save._item_pool2 = 0x9abcdef0;
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
  save._level_count = 30;
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
  other._item_pool1 ^= 1;
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

/* the game's texts: one after another, each ended by a 0 */
UTEST(card, a_text_is_put_over_the_one_at_its_index_padded_with_spaces) {
  char texts[] = "aaaaaaaa\0bbbbbbbb\0cccccccc";

  CardPutText(texts, 1, "HI", 8);
  ASSERT_STREQ("aaaaaaaa", texts);
  ASSERT_STREQ("HI      ", texts + 9);
  ASSERT_STREQ("cccccccc", texts + 18);
}

UTEST(card, a_text_longer_than_its_length_is_cut) {
  char texts[] = "aaaa\0bbbb";

  CardPutText(texts, 0, "LONGER", 4);
  ASSERT_STREQ("LONG", texts);
  ASSERT_STREQ("bbbb", texts + 5);
}

/* the game's letters have ( ) at { }, and its { } are drawn as ~ % */
UTEST(card, a_texts_brackets_and_percent_are_put_as_the_games_letters_have_them) {
  char texts[] = "aaaaaaaaaaa";

  CardPutText(texts, 0, "CRASH (12%)", 11);
  ASSERT_STREQ("CRASH (12})", texts);
  CardPutText(texts, 0, "{~}", 11);
  ASSERT_STREQ("({)        ", texts);
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
  save._level_count = level_count;
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

/* the card's states */

static card_save game_now;      /* the game, as the card captures it */
static int game_percent;
static card_save game_loaded;   /* and as a save last put it */
static int game_loads;

static void CaptureGame(card_save *save, int *percent) {
  *save = game_now;
  *percent = game_percent;
}

static void ApplyToGame(const card_save *save) {
  game_loaded = *save;
  game_loads++;
}

static uint32_t NewSaveId(void) {
  return 424242;
}

static const card_game test_game = { CaptureGame, ApplyToGame, NewSaveId };

/* steps the card until it's ready, as the game's screens wait for it; whether it got there */
static int Settle(card *c) {
  int i;

  for (i = 0; i < 100; i++) {
    if (c->state == CARD_STATE_IDLE && !(c->flags & CARD_FLAGS_UNREADY)) { return 1; }
    CardStep(c, &test_game);
  }
  return 0;
}

/* an empty card folder with the game at a level count, as percent done, and the card on it ready */
static void ReadyCard(card *c, int level_count, int percent) {
  FreshCard();
  game_now = SomeSave();
  game_now._level_count = level_count;
  game_now.progress = CardProgress(0, 0, level_count);
  game_percent = percent;
  game_loads = 0;
  CardReset(c, CARD_DIR, 1);
  Settle(c);
}

UTEST(card_states, a_card_just_reset_needs_checking) {
  card c;

  FreshCard();
  CardReset(&c, CARD_DIR, 1);
  ASSERT_TRUE(c.flags & CARD_FLAG_CHECK_NEEDED);
  ASSERT_EQ(0, c.slot_count);
}

UTEST(card_states, a_card_is_busy_while_its_checked_and_its_saves_are_read) {
  card c;

  FreshCard();
  WriteSave("BASCUS-9490000111111", 2, 5);
  CardReset(&c, CARD_DIR, 1);
  CardStep(&c, &test_game);
  ASSERT_TRUE(c.flags & CARD_FLAGS_UNREADY);
}

UTEST(card_states, a_card_settles_ready_with_no_error) {
  card c;

  FreshCard();
  CardReset(&c, CARD_DIR, 1);
  ASSERT_TRUE(Settle(&c));
  ASSERT_FALSE(c.flags & CARD_FLAG_ERROR);
  ASSERT_TRUE(c.flags & CARD_FLAG_6);
}

UTEST(card_states, an_empty_card_has_no_slots) {
  card c;

  ReadyCard(&c, 2, 5);
  ASSERT_EQ(0, c.slot_count);
}

UTEST(card_states, a_cards_saves_are_its_slots_with_their_names_and_infos) {
  card c;
  card_save first;

  FreshCard();
  first = WriteSave("BASCUS-9490000111111", 2, 5);
  WriteSave("BASCUS-9490001222222", 3, 10);
  CardReset(&c, CARD_DIR, 1);
  ASSERT_TRUE(Settle(&c));
  ASSERT_EQ(2, c.slot_count);
  ASSERT_STREQ("CRASH (5%)", c.slots[0].name);
  ASSERT_STREQ("CRASH (10%)", c.slots[1].name);
  ASSERT_EQ(CardSlotInfo(first.progress), c.slots[0].info);
}

UTEST(card_states, saving_past_the_last_slot_makes_a_new_save_of_the_game) {
  card c;
  card_save read;
  char slot_name[CARD_SLOT_NAME_SIZE];

  ReadyCard(&c, 9, 30);
  ASSERT_EQ(0, CardRequest(&c, CARD_OP_SAVE, 0));
  ASSERT_TRUE(c.flags & CARD_FLAG_PENDING_IO);
  ASSERT_TRUE(Settle(&c));
  ASSERT_FALSE(c.flags & CARD_FLAG_ERROR);
  ASSERT_EQ(1, c.slot_count);
  ASSERT_STREQ("BASCUS-9490000424242", c.slots[0].file_name);
  ASSERT_STREQ("CRASH (30%)", c.slots[0].name);
  ASSERT_EQ(1, CardFileRead(CARD_DIR, "BASCUS-9490000424242", &read, slot_name, sizeof(slot_name)));
  ASSERT_EQ(9, read._level_count);
}

UTEST(card_states, a_second_new_save_is_numbered_after_the_first) {
  card c;

  ReadyCard(&c, 9, 30);
  CardRequest(&c, CARD_OP_SAVE, 0);
  Settle(&c);
  CardRequest(&c, CARD_OP_SAVE, 1);
  ASSERT_TRUE(Settle(&c));
  ASSERT_EQ(2, c.slot_count);
  ASSERT_STREQ("BASCUS-9490001424242", c.slots[1].file_name);
}

UTEST(card_states, saving_to_a_slot_saves_over_it) {
  card c;
  card_save read;
  char slot_name[CARD_SLOT_NAME_SIZE];

  ReadyCard(&c, 9, 30);
  CardRequest(&c, CARD_OP_SAVE, 0);
  Settle(&c);
  game_now._level_count = 12;
  game_percent = 40;
  ASSERT_EQ(0, CardRequest(&c, CARD_OP_SAVE, 0));
  ASSERT_TRUE(Settle(&c));
  ASSERT_EQ(1, c.slot_count);
  ASSERT_STREQ("CRASH (40%)", c.slots[0].name);
  CardFileRead(CARD_DIR, c.slots[0].file_name, &read, slot_name, sizeof(slot_name));
  ASSERT_EQ(12, read._level_count);
}

UTEST(card_states, a_card_saved_to_is_no_longer_a_new_one) {
  card c;

  ReadyCard(&c, 9, 30);
  ASSERT_TRUE(c.flags & CARD_FLAG_NEW_DEVICE);
  CardRequest(&c, CARD_OP_SAVE, 0);
  Settle(&c);
  ASSERT_FALSE(c.flags & CARD_FLAG_NEW_DEVICE);
}

UTEST(card_states, loading_a_slot_puts_the_game_as_its_save_has_it) {
  card c;

  ReadyCard(&c, 9, 30);
  CardRequest(&c, CARD_OP_SAVE, 0);
  Settle(&c);
  ASSERT_EQ(0, CardRequest(&c, CARD_OP_LOAD, 0));
  ASSERT_TRUE(Settle(&c));
  ASSERT_FALSE(c.flags & CARD_FLAG_ERROR);
  ASSERT_EQ(1, game_loads);
  ASSERT_EQ(9, game_loaded._level_count);
}

UTEST(card_states, loading_a_slot_that_isnt_there_is_an_error_and_leaves_the_game) {
  card c;

  ReadyCard(&c, 9, 30);
  CardRequest(&c, CARD_OP_LOAD, 3);
  ASSERT_TRUE(Settle(&c));
  ASSERT_TRUE(c.flags & CARD_FLAG_ERROR);
  ASSERT_EQ(0, game_loads);
}

UTEST(card_states, loading_a_spoiled_save_is_an_error_and_leaves_the_game) {
  card c;
  int i;

  ReadyCard(&c, 9, 30);
  CardRequest(&c, CARD_OP_SAVE, 0);
  Settle(&c);
  for (i = 4; i < CARD_FILE_BLOCKS; i++) { SpoilBlock(CARD_DIR "/BASCUS-9490000424242", i); }
  CardRequest(&c, CARD_OP_LOAD, 0);
  ASSERT_TRUE(Settle(&c));
  ASSERT_TRUE(c.flags & CARD_FLAG_ERROR);
  ASSERT_EQ(0, game_loads);
}

UTEST(card_states, a_card_that_needs_checking_refuses_saving_and_loading) {
  card c;

  FreshCard();
  CardReset(&c, CARD_DIR, 1);
  ASSERT_EQ(1, CardRequest(&c, CARD_OP_SAVE, 0));
  ASSERT_TRUE(c.flags & CARD_FLAG_ERROR);
  ASSERT_EQ(1, CardRequest(&c, CARD_OP_LOAD, 0));
}

UTEST(card_states, formatting_deletes_the_cards_saves) {
  card c;
  char file_names[CARD_SLOT_MAX][CARD_FILE_NAME_SIZE];

  ReadyCard(&c, 9, 30);
  CardRequest(&c, CARD_OP_SAVE, 0);
  Settle(&c);
  ASSERT_EQ(0, CardRequest(&c, CARD_OP_FORMAT, 0));
  ASSERT_TRUE(Settle(&c));
  ASSERT_EQ(0, c.slot_count);
  ASSERT_EQ(0, CardListFiles(CARD_DIR, file_names));
}

UTEST(card_states, a_busy_card_refuses_formatting) {
  card c;

  ReadyCard(&c, 9, 30);
  CardRequest(&c, CARD_OP_SAVE, 0);
  ASSERT_EQ(1, CardRequest(&c, CARD_OP_FORMAT, 0));
  ASSERT_TRUE(c.flags & CARD_FLAG_ERROR);
}

UTEST(card_states, saving_again_saves_over_the_save_last_written) {
  card c;

  ReadyCard(&c, 9, 30);
  CardRequest(&c, CARD_OP_SAVE, 0);
  Settle(&c);
  game_percent = 55;
  ASSERT_EQ(0, CardRequest(&c, CARD_OP_SAVE_AGAIN, 0));
  ASSERT_TRUE(Settle(&c));
  ASSERT_EQ(1, c.slot_count);
  ASSERT_STREQ("CRASH (55%)", c.slots[0].name);
}

UTEST(card_states, saving_again_is_refused_with_no_save_written) {
  card c;

  ReadyCard(&c, 9, 30);
  ASSERT_EQ(1, CardRequest(&c, CARD_OP_SAVE_AGAIN, 0));
  ASSERT_TRUE(c.flags & CARD_FLAG_ERROR);
}

UTEST(card_states, saving_again_is_refused_once_the_last_save_is_forgotten) {
  card c;

  ReadyCard(&c, 9, 30);
  CardRequest(&c, CARD_OP_SAVE, 0);
  Settle(&c);
  ASSERT_EQ(0, CardRequest(&c, CARD_OP_FORGET_LAST, 0));
  ASSERT_EQ(1, CardRequest(&c, CARD_OP_SAVE_AGAIN, 0));
}

UTEST(card_states, the_last_save_can_be_saved_over_once_one_is_written) {
  card c;

  ReadyCard(&c, 9, 30);
  ASSERT_EQ(1, CardRequest(&c, CARD_OP_HAS_LAST, 0));
  CardRequest(&c, CARD_OP_SAVE, 0);
  Settle(&c);
  ASSERT_EQ(0, CardRequest(&c, CARD_OP_HAS_LAST, 0));
}

UTEST(card_states, theres_always_a_card) {
  card c;

  ReadyCard(&c, 9, 30);
  ASSERT_EQ(0, CardRequest(&c, CARD_OP_IS_THERE, 0));
}

UTEST(card_states, the_game_can_clear_flag_6) {
  card c;

  ReadyCard(&c, 9, 30);
  ASSERT_EQ(0, CardRequest(&c, CARD_OP_CLEAR_FLAG_6, 0));
  ASSERT_FALSE(c.flags & CARD_FLAG_6);
}

UTEST(card_states, checking_again_reads_saves_put_there_since) {
  card c;

  ReadyCard(&c, 9, 30);
  WriteSave("BASCUS-9490000111111", 2, 5);
  ASSERT_EQ(0, CardRequest(&c, CARD_OP_CHECK, 0));
  ASSERT_TRUE(c.flags & CARD_FLAG_CHECK_NEEDED);
  ASSERT_TRUE(Settle(&c));
  ASSERT_EQ(1, c.slot_count);
}

UTEST(card_states, an_op_the_card_doesnt_know_is_refused) {
  card c;

  ReadyCard(&c, 9, 30);
  ASSERT_EQ(1, CardRequest(&c, 99, 0));
}
