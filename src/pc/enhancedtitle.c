#include <string.h>
#include "enhancedtitle.h"

/* the title screen has just loaded: its logo hasn't landed yet */
void EnhancedTitleReset(enhanced_title *title) {
  title->logo_landed = 0;
}

static int IsLogoTrademark(uint32_t subtype, uint32_t status_b) {
  return subtype == TITLE_LOGO_SUBTYPE && (status_b & TITLE_LOGO_FLAG_2D);
}

/* each title screen object, every frame: the logo has landed once its TM is there */
void EnhancedTitleNoteObject(enhanced_title *title, uint32_t subtype,
  uint32_t status_b) {
  if (IsLogoTrademark(subtype, status_b))
    title->logo_landed = 1;
}

/* whether N-Hanced is drawn along with the menu item reading menu_text */
int EnhancedTitleDrawsWith(const enhanced_title *title, const char *menu_text) {
  if (!title->logo_landed) { return 0; }
  return strcmp(menu_text, ENHANCED_TITLE_ANCHOR) == 0;
}

void EnhancedTitleAt(rect2 *at) {
  at->x = ENHANCED_TITLE_LEFT;
  at->y = ENHANCED_TITLE_TOP;
  at->w = ENHANCED_TITLE_WIDTH;
  at->h = ENHANCED_TITLE_HEIGHT;
}

void EnhancedTitleCoopAt(rect2 *at) {
  rect2 n_hanced;
  int32_t right, bottom;

  EnhancedTitleAt(&n_hanced);
  right = n_hanced.x + (int32_t)n_hanced.w + ENHANCED_TITLE_COOP_OVERHANG;
  bottom = n_hanced.y + (int32_t)n_hanced.h - ENHANCED_TITLE_COOP_RISE;
  at->x = right - ENHANCED_TITLE_COOP_WIDTH;
  at->y = bottom - ENHANCED_TITLE_COOP_HEIGHT;
  at->w = ENHANCED_TITLE_COOP_WIDTH;
  at->h = ENHANCED_TITLE_COOP_HEIGHT;
}

int EnhancedTitleShowsCoop(int n_hanced_shown, int two_players) {
  return n_hanced_shown && two_players;
}
