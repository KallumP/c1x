#ifndef _PC_CARDICON_H_
#define _PC_CARDICON_H_

#include "common.h"
#include "geom.h"
#include "pc/card.h"

/*
 * a save's icon in a texture page (pc): the ps1 game kept the card screens'
 * slot icons in vram, a 16x16 frame at 4 bits a pixel and a 16 colour palette
 * each, where the screens' sprites read them, and copied them to and from a
 * save's blocks. here they're copied to and from the page's bytes, at the
 * places a sprite's texinfo gives: a frame at its segment and offsets, its
 * palette at its clut x and y. a page is 256 16-bit words a row
 */
#define CARD_ICON_PAGE_PITCH     512 /* bytes a row of a page */
#define CARD_ICON_FRAME_ROWS     16
#define CARD_ICON_FRAME_ROW_SIZE 8   /* 16 pixels, 2 a byte */

extern int CardIconFrameAt(const texinfo2 *info);
extern int CardIconPaletteAt(const texinfo2 *info);
extern void CardIconFrameToPage(uint8_t *page, const texinfo2 *info, const uint8_t *frame);
extern void CardIconFrameFromPage(const uint8_t *page, const texinfo2 *info, uint8_t *frame);
extern void CardIconPaletteToPage(uint8_t *page, const texinfo2 *info, const uint16_t *palette);
extern void CardIconPaletteFromPage(const uint8_t *page, const texinfo2 *info, uint16_t *palette);

#endif /* _PC_CARDICON_H_ */
