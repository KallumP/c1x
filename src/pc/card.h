#ifndef _PC_CARD_H_
#define _PC_CARD_H_

/*
 * the memory card (pc): the ps1's, which the game's own save and load screens
 * use, stood in for by save files in a folder. the game asks for something
 * with CardControl (card_game.c), then watches the card's flags, slot count
 * and slot infos while it's done a step a frame, as the ps1 game's card code
 * did it (src/psx/card.c, before the ps1 build was removed).
 *
 * this file has none of the game's own state in it, so it can be tested
 */
#include <stdint.h>

#define CARD_BLOCK_SIZE 128 /* the ps1 reads and writes a card 128 bytes at a time */

/* what a save keeps of the game: one block, as the ps1 game laid it out. the game's own
   values go by these names without the _ (src/globals.h) */
typedef struct {
  uint32_t progress;        /* keys, gems and levels: see CardProgress */
  int32_t _level_count;
  int32_t _init_life_count;
  uint32_t _dword_8006190C;
  int32_t _mono;
  uint32_t _sfx_vol;
  uint32_t _mus_vol;
  uint32_t _item_pool1;
  uint32_t _item_pool2;
  uint32_t unk;
  uint32_t unused[21];
  uint32_t checksum;        /* of the block with this 0: see CardSaveSeal */
} card_save;

/*
 * a save is a file in the card's folder, named as the ps1 game names its saves
 * and laid out as it writes them, a block each: a header with its name, three
 * icons (left empty here), then five copies of what it keeps
 */
#define CARD_SLOT_MAX       15 /* saves a card holds */
#define CARD_FILE_NAME_SIZE 24 /* BASCUS-94900, a 2 digit count and a 6 digit id */
#define CARD_SLOT_NAME_SIZE 32
#define CARD_SAVE_COPIES    5
#define CARD_FILE_BLOCKS    (1 + 3 + CARD_SAVE_COPIES)

extern uint32_t CardChecksum(const uint8_t *buf, int len);
extern void CardSaveSeal(card_save *save);
extern int CardSaveIsValid(const card_save *save);
extern uint32_t CardProgress(int key_count, int gem_count, int level_count);
extern uint32_t CardSlotInfo(uint32_t progress);
extern void CardSlotName(char *name, int size, int percent);

extern int CardFileWrite(const char *dir, const char *file_name, const card_save *save, int percent);
extern int CardFileRead(const char *dir, const char *file_name, card_save *save, char *slot_name, int size);
extern int CardListFiles(const char *dir, char file_names[CARD_SLOT_MAX][CARD_FILE_NAME_SIZE]);
extern void CardNextFileName(char *file_name, const char *last_file_name, uint32_t save_id);
extern int CardDeleteFiles(const char *dir);

/* the card's flags, which the game's screens watch (card_flags_ro) */
#define CARD_FLAG_PENDING_IO   1    /* it's busy with what was asked */
#define CARD_FLAG_ERROR        2    /* what was asked couldn't be done */
#define CARD_FLAG_CHECK_NEEDED 4    /* it hasn't been looked at yet */
#define CARD_FLAG_CHECKING     8    /* it's being looked at */
#define CARD_FLAG_NEW_DEVICE   0x10 /* it's a card not saved to yet */
#define CARD_FLAG_6            0x20 /* set when it's checked, until the game clears it */
#define CARD_FLAGS_UNREADY     (CARD_FLAG_PENDING_IO | CARD_FLAG_CHECK_NEEDED | CARD_FLAG_CHECKING)

/* what the game asks of the card (CardRequest), as its code numbers them */
#define CARD_OP_CLEAR_FLAG_6 2
#define CARD_OP_SAVE         3  /* to a slot, or a new one past the last */
#define CARD_OP_LOAD         4  /* from a slot */
#define CARD_OP_FORMAT       5
#define CARD_OP_SAVE_AGAIN   6  /* over the save last written */
#define CARD_OP_HAS_LAST     7  /* 0 if the save last written can be saved over */
#define CARD_OP_IS_THERE     8  /* 0 if there's a card */
#define CARD_OP_FORGET_LAST  9
#define CARD_OP_CHECK        10 /* look at the card again */

#define CARD_STATE_IDLE 0

/* a slot: a save on the card, as the game's screens show it */
typedef struct {
  char file_name[CARD_FILE_NAME_SIZE];
  char name[CARD_SLOT_NAME_SIZE];
  uint32_t info; /* see CardSlotInfo */
} card_slot;

/* what the card needs of the game */
typedef struct {
  void (*capture)(card_save *save, int *percent); /* the game as it is, to save (not yet sealed) */
  void (*apply)(const card_save *save);           /* the game put as a save has it */
  uint32_t (*new_id)(void);                       /* an id for a new save's name */
} card_game;

typedef struct {
  const char *dir;  /* its folder of saves */
  int state;
  uint32_t flags;
  int idx;          /* the slot asked for */
  int new_device;   /* whether it was a card not saved to yet when it was reset */
  int slot_count;
  card_slot slots[CARD_SLOT_MAX];
  int file_count;   /* the saves being read into slots, and how many have been */
  int file_idx;
  char file_names[CARD_SLOT_MAX][CARD_FILE_NAME_SIZE];
  char last_file_name[CARD_FILE_NAME_SIZE]; /* the save last written, or "" */
} card;

extern void CardReset(card *c, const char *dir, int new_device);
extern void CardStep(card *c, const card_game *game);
extern int CardRequest(card *c, int op, int slot_idx);

#endif /* _PC_CARD_H_ */
