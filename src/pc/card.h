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

/* what a save keeps of the game: one block, as the ps1 game laid it out */
typedef struct {
  uint32_t progress;        /* keys, gems and levels: see CardProgress */
  int32_t level_count;
  int32_t init_life_count;
  uint32_t dword_8006190C;
  int32_t mono;
  uint32_t sfx_vol;
  uint32_t mus_vol;
  uint32_t item_pool1;
  uint32_t item_pool2;
  uint32_t unk;
  uint32_t unused[21];
  uint32_t checksum;        /* of the block with this 0: see CardSaveSeal */
} card_save;

extern uint32_t CardChecksum(const uint8_t *buf, int len);
extern void CardSaveSeal(card_save *save);
extern int CardSaveIsValid(const card_save *save);
extern uint32_t CardProgress(int key_count, int gem_count, int level_count);
extern uint32_t CardSlotInfo(uint32_t progress);
extern void CardSlotName(char *name, int size, int percent);

#endif /* _PC_CARD_H_ */
