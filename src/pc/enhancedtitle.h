#ifndef _PC_ENHANCEDTITLE_H_
#define _PC_ENHANCEDTITLE_H_

#include "common.h"
#include "geom.h"

/*
 * "N-Hanced" under the title screen's logo (pc), a picture in the style of the
 * logo. the logo is game objects (GamOC subtype 11) that swing in after crash
 * runs up; once they've landed, the game shows the logo's TM, a 2D object of
 * the same subtype. from then on, the picture is drawn on the frames the main
 * menu's START item is, so it's only there with the main menu, over the logo
 * and under the fade, so it fades with it
 */
#define ENHANCED_TITLE_ANCHOR  "START"  /* the menu item it's drawn with */
#define TITLE_LOGO_SUBTYPE     11       /* the logo's objects, and its TM */
#define TITLE_LOGO_FLAG_2D     0x200    /* status_b: drawn flat, as the TM is (GOOL_FLAG_2D) */

typedef struct {
  int logo_landed; /* the logo's TM has appeared since the title screen loaded */
} enhanced_title;

/* the picture (next to streams/) and where it's drawn, in the game's screen units:
   512 by 240, from its centre, down being + */
#define ENHANCED_TITLE_PICTURE "assets/enhanced_title.bmp"
#define ENHANCED_TITLE_LEFT    -90
#define ENHANCED_TITLE_TOP     -12
#define ENHANCED_TITLE_WIDTH   190
#define ENHANCED_TITLE_HEIGHT  40

/* CO-OP MODE, with two players: over the right end of N-Hanced's underline */
#define ENHANCED_TITLE_COOP_PICTURE  "assets/coop_title.bmp"
#define ENHANCED_TITLE_COOP_WIDTH    72
#define ENHANCED_TITLE_COOP_HEIGHT   13
#define ENHANCED_TITLE_COOP_OVERHANG 4 /* how far past N-Hanced's right edge it reaches */
#define ENHANCED_TITLE_COOP_RISE     4 /* how far above N-Hanced's bottom its own is */

extern void EnhancedTitleReset(enhanced_title *title);
extern void EnhancedTitleNoteObject(enhanced_title *title, uint32_t subtype,
  uint32_t status_b);
extern int EnhancedTitleDrawsWith(const enhanced_title *title,
  const char *menu_text);
extern void EnhancedTitleAt(rect2 *at);
extern void EnhancedTitleCoopAt(rect2 *at);
extern int EnhancedTitleShowsCoop(int n_hanced_shown, int two_players);

/* the game's title screen (enhancedtitle_game.c) */
struct _gool_object;
extern void EnhancedTitleLoaded(void);
extern void EnhancedTitleSeeObject(struct _gool_object *obj);
extern void EnhancedTitleSeeMenuText(const char *menu_text);
extern void EnhancedTitleDraw(void);

#endif /* _PC_ENHANCEDTITLE_H_ */
