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

/* whether ENHANCED is drawn along with the menu item reading menu_text */
int EnhancedTitleDrawsWith(const enhanced_title *title, const char *menu_text) {
  if (!title->logo_landed) { return 0; }
  return strcmp(menu_text, ENHANCED_TITLE_ANCHOR) == 0;
}
