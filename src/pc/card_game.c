/*
 * the memory card in the game (pc): what the game's save and load screens ask
 * of the card (CardControl) and a step of it each frame they're up, when
 * memory_card is on, saving the game's progress to files in memory_card/.
 * see card.h
 */
#include <SDL2/SDL.h>
#include "card.h"
#include "card_game.h"
#include "globals.h"
#include "ns.h"
#include "level.h"
#include "pc/settings.h"

#define CARD_DIR       "memory_card" /* next to settings.cfg */
#define TEXTS_AT       12            /* the game's texts start this far into card_str */
#define SAVE_ID_RANGE  1000000

extern ns_struct ns;

static card the_card;
static int card_lid = -1;   /* the level the card was last reset in */
static int new_device = 1;  /* whether the card hasn't been saved to since the game began */

/* the game as it is, for a save (the ps1 game's CardSaveGlobals) */
static void CaptureGame(card_save *save, int *percent) {
  SDL_memset(save, 0, sizeof(*save));
  save->progress = CardProgress(key_count, gem_count, level_count);
  save->_level_count = level_count;
  save->_init_life_count = init_life_count;
  save->_dword_8006190C = dword_8006190C;
  save->_mono = mono;
  save->_sfx_vol = sfx_vol;
  save->_mus_vol = mus_vol;
  save->_item_pool1 = item_pool1;
  save->_item_pool2 = item_pool2;
  *percent = percent_complete;
}

/* the game put as a save has it (the ps1 game's CardLoadGlobals) */
static void ApplyToGame(const card_save *save) {
  LevelResetGlobals(1);
  level_count = save->_level_count;
  init_life_count = save->_init_life_count;
  dword_8006190C = save->_dword_8006190C;
  mono = save->_mono;
  sfx_vol = save->_sfx_vol;
  mus_vol = save->_mus_vol;
  item_pool1 = save->_item_pool1;
  item_pool2 = save->_item_pool2;
  levels_unlocked = save->_level_count;
  cur_map_level = save->_level_count;
}

static uint32_t NewSaveId(void) {
  return (uint32_t)(SDL_GetPerformanceCounter() % SAVE_ID_RANGE);
}

static const card_game game = { CaptureGame, ApplyToGame, NewSaveId };

/*
 * the card is put in afresh in each level, as the ps1 game sets it up again
 * for each level with a card screen; the save last written is remembered
 * across them once the card's been saved to
 */
static void ResetCardInNewLevel(void) {
  char last_file_name[CARD_FILE_NAME_SIZE];

  if (!ns.ldat || (int)ns.ldat->lid == card_lid) { return; }
  if (card_lid != -1)
    new_device = (the_card.flags & CARD_FLAG_NEW_DEVICE) != 0;
  SDL_strlcpy(last_file_name, the_card.last_file_name, sizeof(last_file_name));
  CardReset(&the_card, CARD_DIR, new_device);
  if (!new_device)
    SDL_strlcpy(the_card.last_file_name, last_file_name, sizeof(the_card.last_file_name));
  card_lid = ns.ldat->lid;
}

/* each slot's name, or EMPTY, into the card screen's texts, while one's up */
static void ShowSlotNames(void) {
  if (!card_str) { return; }
  CardShowSlotNames(&the_card, card_str + TEXTS_AT, (cur_display_flags & CARD_DISPLAY_FLAG) != 0);
}

/* what the game's screens watch of the card */
static void ShowCard(void) {
  int i;

  card_flags_ro = the_card.flags;
  card_part_count_ro = the_card.slot_count;
  for (i=0;i<CARD_SLOT_MAX;i++)
    card_partinfos[i] = i < the_card.slot_count ? the_card.slots[i].info : 0;
  ShowSlotNames();
}

/*
 * what the game's code asks of the card (its memory card op); 1 with
 * memory_card off, as it's always been here
 */
int CardControl(int op, int part_idx) {
  int res;

  if (!game_settings.memory_card) { return 1; }
  ResetCardInNewLevel();
  res = CardRequest(&the_card, op, part_idx);
  ShowCard();
  return res;
}

/* a frame of the card, while one of the game's card screens is up */
void CardGameUpdate(void) {
  if (!game_settings.memory_card) { return; }
  ResetCardInNewLevel();
  CardStep(&the_card, &game);
  ShowCard();
}

/* the save last written is forgotten when the game's progress is reset, as the ps1 game did */
void CardGameForgetLast(void) {
  the_card.last_file_name[0] = 0;
}
