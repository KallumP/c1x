#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <dirent.h>
#include <sys/stat.h>
#include "card.h"

#define CHECKSUM_SEED 0x12345678 /* the ps1 game's */

/* a slot's info, as the game's screens read it (card_partinfos) */
#define SLOT_READ          1       /* it's been read */
#define SLOT_ICONS_SHIFT   1       /* how many icons it has, from this bit */
#define SLOT_ICON_COUNT    3
#define SLOT_IS_CRASH      8       /* a crash save, with its progress read */
#define SLOT_PROGRESS_SHIFT 5      /* its progress, from this bit */
#define SLOT_NOT_DAMAGED   0x20000

/* each byte added, then the sum turned 3 bits round, so where a byte is counts */
uint32_t CardChecksum(const uint8_t *buf, int len) {
  uint32_t checksum;
  int i;

  checksum = CHECKSUM_SEED;
  for (i=0;i<len;i++) {
    checksum += buf[i];
    checksum = (checksum << 3) | (checksum >> 29);
  }
  return checksum;
}

/* a save's checksum: of its block with the checksum 0 */
static uint32_t SaveChecksum(const card_save *save) {
  card_save copy;

  copy = *save;
  copy.checksum = 0;
  return CardChecksum((const uint8_t*)&copy, sizeof(copy));
}

/* gives a save its checksum, once the rest of it is filled in */
void CardSaveSeal(card_save *save) {
  save->checksum = SaveChecksum(save);
}

/* whether a save read back is as it was sealed */
int CardSaveIsValid(const card_save *save) {
  return save->checksum == SaveChecksum(save);
}

/* how far a save is, as the game's screens show it */
uint32_t CardProgress(int key_count, int gem_count, int level_count) {
  return ((uint32_t)key_count << 10) | ((uint32_t)gem_count << 5) | (uint32_t)level_count;
}

/* the info of a slot holding a crash save with progress */
uint32_t CardSlotInfo(uint32_t progress) {
  return SLOT_NOT_DAMAGED | (progress << SLOT_PROGRESS_SHIFT) | SLOT_IS_CRASH
    | (SLOT_ICON_COUNT << SLOT_ICONS_SHIFT) | SLOT_READ;
}

/* a slot's name on the game's screens: the ps1 game shows its saves' names in capitals */
void CardSlotName(char *name, int size, int percent) {
  snprintf(name, size, "CRASH (%d%%)", percent);
}

/* save files */

#define FILE_PREFIX      "BASCUS-94900" /* the ps1 game's saves' names start with its product code */
#define FILE_PREFIX_SIZE 12
#define FILE_COUNT_MAX   99             /* a save's count is two digits */
#define FILE_ID_RANGE    1000000        /* and its id six */
#define PATH_SIZE        512
#define HEADER_NAME_AT   4              /* a save's name in its header block, after "SC", its icon count and block count */
#define HEADER_ICONS     0x13           /* three icons */

static int IsSaveFileName(const char *file_name) {
  return strncmp(file_name, FILE_PREFIX, FILE_PREFIX_SIZE) == 0 && strlen(file_name) < CARD_FILE_NAME_SIZE;
}

static void FilePath(char *path, const char *dir, const char *file_name) {
  snprintf(path, PATH_SIZE, "%s/%s", dir, file_name);
}

static void MakeDir(const char *dir) {
#ifdef _WIN32
  mkdir(dir);
#else
  mkdir(dir, 0777);
#endif
}

/* a save's header block: the ps1's "SC", then its name */
static void FillHeader(uint8_t *header, int percent) {
  memset(header, 0, CARD_BLOCK_SIZE);
  header[0] = 'S';
  header[1] = 'C';
  header[2] = HEADER_ICONS;
  header[3] = 1;
  snprintf((char*)header + HEADER_NAME_AT, CARD_SLOT_NAME_SIZE, "Crash (%d%%)", percent);
}

/* writes save to file_name in dir (made if it isn't there) as percent done; whether it was written */
int CardFileWrite(const char *dir, const char *file_name, const card_save *save, int percent) {
  uint8_t blocks[CARD_FILE_BLOCKS][CARD_BLOCK_SIZE];
  char path[PATH_SIZE];
  FILE *file;
  size_t written;
  int i;

  memset(blocks, 0, sizeof(blocks));
  FillHeader(blocks[0], percent);
  for (i=CARD_FILE_BLOCKS-CARD_SAVE_COPIES;i<CARD_FILE_BLOCKS;i++)
    memcpy(blocks[i], save, CARD_BLOCK_SIZE);
  MakeDir(dir);
  FilePath(path, dir, file_name);
  file = fopen(path, "wb");
  if (!file) { return 0; }
  written = fwrite(blocks, 1, sizeof(blocks), file);
  fclose(file);
  return written == sizeof(blocks);
}

/* a save's name from its header block, in capitals as the game's screens show it */
static void SlotNameOf(const uint8_t *header, char *slot_name, int size) {
  int i;

  snprintf(slot_name, size, "%.*s", CARD_SLOT_NAME_SIZE-1, (const char*)header + HEADER_NAME_AT);
  for (i=0;slot_name[i];i++) {
    if (slot_name[i] >= 'a' && slot_name[i] <= 'z')
      slot_name[i] -= 'a' - 'A';
  }
}

/* reads file_name in dir: its first copy of the save that's valid, and its slot name; whether one was */
int CardFileRead(const char *dir, const char *file_name, card_save *save, char *slot_name, int size) {
  uint8_t blocks[CARD_FILE_BLOCKS][CARD_BLOCK_SIZE];
  char path[PATH_SIZE];
  FILE *file;
  size_t read;
  int i;

  FilePath(path, dir, file_name);
  file = fopen(path, "rb");
  if (!file) { return 0; }
  read = fread(blocks, 1, sizeof(blocks), file);
  fclose(file);
  if (read != sizeof(blocks) || blocks[0][0] != 'S' || blocks[0][1] != 'C') { return 0; }
  SlotNameOf(blocks[0], slot_name, size);
  for (i=CARD_FILE_BLOCKS-CARD_SAVE_COPIES;i<CARD_FILE_BLOCKS;i++) {
    memcpy(save, blocks[i], CARD_BLOCK_SIZE);
    if (CardSaveIsValid(save)) { return 1; }
  }
  return 0;
}

static int CompareFileNames(const void *a, const void *b) {
  return strcmp((const char*)a, (const char*)b);
}

/* every save file's name in dir, in order */
static int ListAllFiles(const char *dir, char (**file_names)[CARD_FILE_NAME_SIZE]) {
  DIR *folder;
  struct dirent *item;
  char (*names)[CARD_FILE_NAME_SIZE];
  int count;

  *file_names = 0;
  folder = opendir(dir);
  if (!folder) { return 0; }
  names = 0;
  count = 0;
  while ((item = readdir(folder))) {
    if (!IsSaveFileName(item->d_name)) { continue; }
    names = realloc(names, (count+1)*sizeof(*names));
    strcpy(names[count++], item->d_name);
  }
  closedir(folder);
  if (count)
    qsort(names, count, sizeof(*names), CompareFileNames);
  *file_names = names;
  return count;
}

/* the names of the saves in dir, in order, up to as many as a card holds; how many */
int CardListFiles(const char *dir, char file_names[CARD_SLOT_MAX][CARD_FILE_NAME_SIZE]) {
  char (*names)[CARD_FILE_NAME_SIZE];
  int count;

  count = ListAllFiles(dir, &names);
  if (count > CARD_SLOT_MAX)
    count = CARD_SLOT_MAX;
  if (count)
    memcpy(file_names, names, count*sizeof(*names));
  free(names);
  return count;
}

/* a new save's name: numbered one on from the card's last save's (0 without one), with its id */
void CardNextFileName(char *file_name, const char *last_file_name, uint32_t save_id) {
  int count;

  count = 0;
  if (last_file_name && IsSaveFileName(last_file_name) && strlen(last_file_name) >= FILE_PREFIX_SIZE+2)
    count = (last_file_name[FILE_PREFIX_SIZE]-'0')*10 + (last_file_name[FILE_PREFIX_SIZE+1]-'0') + 1;
  if (count > FILE_COUNT_MAX)
    count = FILE_COUNT_MAX;
  snprintf(file_name, CARD_FILE_NAME_SIZE, "%s%02d%06u", FILE_PREFIX, count, (unsigned)(save_id % FILE_ID_RANGE));
}

/* deletes every save in dir, as formatting a card does; how many */
int CardDeleteFiles(const char *dir) {
  char (*names)[CARD_FILE_NAME_SIZE];
  char path[PATH_SIZE];
  int i, count;

  count = ListAllFiles(dir, &names);
  for (i=0;i<count;i++) {
    FilePath(path, dir, names[i]);
    remove(path);
  }
  free(names);
  return count;
}

/* the card's states, numbered as the ps1 game's card code has them */

#define STATE_SCAN_START 1 /* about to list its saves */
#define STATE_LOAD       2
#define STATE_FORMAT     3
#define STATE_CHECK      4 /* being looked at */
#define STATE_SCAN       5 /* its saves being read into slots, one a step */
#define STATE_SAVE       6

/* a slot whose save can't be read */
#define SLOT_DAMAGED_NAME "DAMAGED SLOT"
#define SLOT_DAMAGED_INFO (SLOT_READ | (1 << SLOT_ICONS_SHIFT))

/* it's busy with a state, until it's idle again */
static void SetState(card *c, int state) {
  c->state = state;
  if (state == CARD_STATE_IDLE)
    c->flags &= ~CARD_FLAG_PENDING_IO;
  else
    c->flags |= CARD_FLAG_PENDING_IO;
}

static void ClearSlots(card *c) {
  c->slot_count = 0;
  memset(c->slots, 0, sizeof(c->slots));
}

/* a card as it's put in: not looked at yet. new_device is whether it's one not saved to yet */
void CardReset(card *c, const char *dir, int new_device) {
  memset(c, 0, sizeof(*c));
  c->dir = dir;
  c->new_device = new_device;
  c->flags = CARD_FLAG_CHECK_NEEDED;
  if (new_device)
    c->flags |= CARD_FLAG_NEW_DEVICE;
}

/* its saves are read again, unless it's busy or needs checking first */
static void ScanIfReady(card *c) {
  if (c->flags & CARD_FLAGS_UNREADY) { return; }
  SetState(c, STATE_SCAN_START);
}

/* idle: a card that needs checking starts being checked */
static void StepIdle(card *c) {
  if (!(c->flags & CARD_FLAG_CHECK_NEEDED)) { return; }
  ClearSlots(c);
  c->flags &= ~(CARD_FLAG_ERROR | CARD_FLAG_CHECK_NEEDED);
  c->flags |= CARD_FLAG_CHECKING | CARD_FLAG_NEW_DEVICE | CARD_FLAG_6;
  SetState(c, STATE_CHECK);
}

/* a card in a folder is always there and readable, so its check passes */
static void StepCheck(card *c) {
  c->flags &= ~(CARD_FLAG_ERROR | CARD_FLAG_CHECKING);
  SetState(c, CARD_STATE_IDLE);
  ScanIfReady(c);
}

static void StepScanStart(card *c) {
  c->file_count = CardListFiles(c->dir, c->file_names);
  c->file_idx = 0;
  c->flags &= ~CARD_FLAG_ERROR;
  ClearSlots(c);
  SetState(c, STATE_SCAN);
}

/* reads the next save into the next slot, or is done with them all read */
static void StepScan(card *c) {
  card_slot *slot;
  card_save save;

  if (c->file_idx >= c->file_count) {
    c->flags &= ~CARD_FLAG_ERROR;
    SetState(c, CARD_STATE_IDLE);
    return;
  }
  slot = &c->slots[c->slot_count++];
  strcpy(slot->file_name, c->file_names[c->file_idx++]);
  if (CardFileRead(c->dir, slot->file_name, &save, slot->name, sizeof(slot->name))) {
    slot->info = CardSlotInfo(save.progress);
    return;
  }
  snprintf(slot->name, sizeof(slot->name), "%s", SLOT_DAMAGED_NAME);
  slot->info = SLOT_DAMAGED_INFO;
}

/* the file a save to the slot asked for goes in: the slot's, or a new one past the last slot */
static void SaveFileName(const card *c, const card_game *game, char *file_name) {
  const char *last;

  if (c->idx >= 0 && c->idx < c->slot_count) {
    strcpy(file_name, c->slots[c->idx].file_name);
    return;
  }
  last = c->slot_count ? c->slots[c->slot_count-1].file_name : 0;
  CardNextFileName(file_name, last, game->new_id());
}

/* saves the game as it is, then reads the card's saves again */
static void StepSave(card *c, const card_game *game) {
  char file_name[CARD_FILE_NAME_SIZE];
  card_save save;
  int percent;

  game->capture(&save, &percent);
  CardSaveSeal(&save);
  SaveFileName(c, game, file_name);
  SetState(c, CARD_STATE_IDLE);
  if (!CardFileWrite(c->dir, file_name, &save, percent)) {
    c->flags |= CARD_FLAG_ERROR;
    return;
  }
  c->flags &= ~(CARD_FLAG_ERROR | CARD_FLAG_NEW_DEVICE);
  strcpy(c->last_file_name, file_name);
  ScanIfReady(c);
}

/* puts the game as the slot asked for has it; an error if it has no save that reads */
static void StepLoad(card *c, const card_game *game) {
  char name[CARD_SLOT_NAME_SIZE];
  card_save save;

  SetState(c, CARD_STATE_IDLE);
  if (c->idx < 0 || c->idx >= c->slot_count
    || !CardFileRead(c->dir, c->slots[c->idx].file_name, &save, name, sizeof(name))) {
    c->flags |= CARD_FLAG_ERROR;
    return;
  }
  game->apply(&save);
}

/* deletes its saves; it's then looked at again, as a formatted ps1 card is */
static void StepFormat(card *c) {
  CardDeleteFiles(c->dir);
  c->flags &= ~CARD_FLAG_ERROR;
  c->flags |= CARD_FLAG_CHECK_NEEDED;
  SetState(c, CARD_STATE_IDLE);
}

/* a frame's work on what the card's busy with */
void CardStep(card *c, const card_game *game) {
  switch (c->state) {
  case CARD_STATE_IDLE:  StepIdle(c);        break;
  case STATE_SCAN_START: StepScanStart(c);   break;
  case STATE_LOAD:       StepLoad(c, game);  break;
  case STATE_FORMAT:     StepFormat(c);      break;
  case STATE_CHECK:      StepCheck(c);       break;
  case STATE_SCAN:       StepScan(c);        break;
  case STATE_SAVE:       StepSave(c, game);  break;
  }
}

/* an error, for a request the card refuses */
static int Refuse(card *c) {
  c->flags |= CARD_FLAG_ERROR;
  return 1;
}

/* starts on a slot, unless the card's busy or needs checking */
static int RequestSlot(card *c, int state, int slot_idx) {
  if (c->flags & CARD_FLAGS_UNREADY) { return Refuse(c); }
  c->idx = slot_idx;
  SetState(c, state);
  return 0;
}

static int RequestFormat(card *c) {
  if (c->state != CARD_STATE_IDLE) { return Refuse(c); }
  SetState(c, STATE_FORMAT);
  return 0;
}

/* the slot of the save last written, or -1 */
static int LastSaveSlot(const card *c) {
  int i;

  if (!c->last_file_name[0]) { return -1; }
  for (i=0;i<c->slot_count;i++) {
    if (strcmp(c->slots[i].file_name, c->last_file_name) == 0) { return i; }
  }
  return -1;
}

static int RequestSaveAgain(card *c) {
  int idx;

  if (c->flags & CARD_FLAGS_UNREADY) { return Refuse(c); }
  idx = LastSaveSlot(c);
  if (idx < 0) { return Refuse(c); }
  return RequestSlot(c, STATE_SAVE, idx);
}

/* 0 if there's a save last written to save over, on a card put in since the game began */
static int RequestHasLast(const card *c) {
  if (!(c->flags & CARD_FLAG_NEW_DEVICE) && !c->new_device) { return 1; }
  return !c->last_file_name[0];
}

static int RequestCheck(card *c) {
  ClearSlots(c);
  SetState(c, CARD_STATE_IDLE);
  c->flags = (c->flags & CARD_FLAG_NEW_DEVICE) | CARD_FLAG_CHECK_NEEDED;
  return 0;
}

/*
 * what the game asks of the card (a CARD_OP), which CardStep then does a
 * step at a time; 0 if it's started or done, 1 if it's refused
 */
int CardRequest(card *c, int op, int slot_idx) {
  switch (op) {
  case CARD_OP_CLEAR_FLAG_6: c->flags &= ~CARD_FLAG_6; return 0;
  case CARD_OP_SAVE:         return RequestSlot(c, STATE_SAVE, slot_idx);
  case CARD_OP_LOAD:         return RequestSlot(c, STATE_LOAD, slot_idx);
  case CARD_OP_FORMAT:       return RequestFormat(c);
  case CARD_OP_SAVE_AGAIN:   return RequestSaveAgain(c);
  case CARD_OP_HAS_LAST:     return RequestHasLast(c);
  case CARD_OP_IS_THERE:     return 0;
  case CARD_OP_FORGET_LAST:  c->last_file_name[0] = 0; return 0;
  case CARD_OP_CHECK:        return RequestCheck(c);
  }
  return 1;
}
