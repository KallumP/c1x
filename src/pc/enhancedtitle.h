#ifndef _PC_ENHANCEDTITLE_H_
#define _PC_ENHANCEDTITLE_H_

#include "common.h"

/*
 * "ENHANCED" under the title screen's logo (pc). the logo is game objects
 * (GamOC subtype 11) that swing in after crash runs up; once they've landed,
 * the game shows the logo's TM, a 2D object of the same subtype. from then on,
 * ENHANCED is drawn in the main menu's own letters, along with its START item,
 * so it's only there with the main menu and fades with it
 */
#define ENHANCED_TITLE_TEXT    "ENHANCED"
#define ENHANCED_TITLE_ANCHOR  "START"  /* the menu item it's drawn with */
#define TITLE_LOGO_SUBTYPE     11       /* the logo's objects, and its TM */
#define TITLE_LOGO_FLAG_2D     0x200    /* status_b: drawn flat, as the TM is (GOOL_FLAG_2D) */

typedef struct {
  int logo_landed; /* the logo's TM has appeared since the title screen loaded */
} enhanced_title;

extern void EnhancedTitleReset(enhanced_title *title);
extern void EnhancedTitleNoteObject(enhanced_title *title, uint32_t subtype,
  uint32_t status_b);
extern int EnhancedTitleDrawsWith(const enhanced_title *title,
  const char *menu_text);

#endif /* _PC_ENHANCEDTITLE_H_ */
