/*
 * a save's icon in the game (pc): taken from the card icon art the card
 * screens give the game (card_icon, a sprite or fragment anim) when saving,
 * and put in that art's texture page at a slot's frames as a card's saves
 * are read, where the slot board's sprites show it blinking. see cardicon.h
 */
#include "cardicon.h"
#include "globals.h"
#include "ns.h"
#include "formats/gool.h"
#include "pc/gfx/tex.h"

#define ICON_SOURCE_FRAME_A 45 /* the art's blinking crash face: the slot's frames 0 and 1 ... */
#define ICON_SOURCE_FRAME_B 46 /* ... and frame 2, the blink */
#define SLOT_FRAMES         3  /* a slot's frames in the art, one texinfo each, slot by slot */

extern page_struct texture_pages[NS_TEXTURE_PAGE_COUNT];

static const gool_anim *CardIconArt(void) {
  return (const gool_anim*)card_icon;
}

/* the art's texinfo at idx: its frames are sprites, or fragments with a texinfo each */
static const texinfo2 *ArtTexinfo(const gool_anim *art, int idx) {
  if (art->type == GOOL_ANIM_TYPE_SPRITE) { return &art->s.texinfos[idx]; }
  if (art->type == GOOL_ANIM_TYPE_FRAG) { return &art->r.frags[idx].texinfo; }
  return 0;
}

/* the art's texture page's bytes, if it's loaded */
static uint8_t *ArtPage(const gool_anim *art) {
  int i;

  for (i=0;i<NS_TEXTURE_PAGE_COUNT;i++) {
    if (texture_pages[i].eid == art->eid)
      return ((tpage*)texture_pages[i].page)->data;
  }
  return 0;
}

static void TakeFrame(const uint8_t *page, const gool_anim *art, int source_idx, uint8_t *frame) {
  const texinfo2 *info;

  info = ArtTexinfo(art, source_idx);
  if (info)
    CardIconFrameFromPage(page, info, frame);
}

/* the game's icon from the art: the crash face twice, then the blink, with the face's palette */
void CardIconGameTake(card_save_icon *icon) {
  const gool_anim *art;
  const uint8_t *page;
  const texinfo2 *info;

  memset(icon, 0, sizeof(*icon));
  art = CardIconArt();
  if (!art) { return; }
  page = ArtPage(art);
  info = ArtTexinfo(art, ICON_SOURCE_FRAME_A);
  if (!page || !info) { return; }
  CardIconPaletteFromPage(page, info, icon->palette);
  TakeFrame(page, art, ICON_SOURCE_FRAME_A, icon->frames[0]);
  TakeFrame(page, art, ICON_SOURCE_FRAME_A, icon->frames[1]);
  TakeFrame(page, art, ICON_SOURCE_FRAME_B, icon->frames[2]);
}

static void ShowFrame(uint8_t *page, const gool_anim *art, int slot_idx, int frame_idx, const card_save_icon *icon) {
  const texinfo2 *info;

  info = ArtTexinfo(art, slot_idx * SLOT_FRAMES + frame_idx);
  if (!info) { return; }
  CardIconFrameToPage(page, info, icon->frames[frame_idx]);
  CardIconPaletteToPage(page, info, icon->palette);
}

/* a slot's icon into the art's page at the slot's frames */
void CardIconGameShow(int slot_idx, const card_save_icon *icon) {
  const gool_anim *art;
  uint8_t *page;
  int frame_idx;

  art = CardIconArt();
  if (!art) { return; }
  page = ArtPage(art);
  if (!page) { return; }
  for (frame_idx=0;frame_idx<SLOT_FRAMES;frame_idx++)
    ShowFrame(page, art, slot_idx, frame_idx, icon);
  TexturePageChanged(art->eid);
}
