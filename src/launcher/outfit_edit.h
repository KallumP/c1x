#ifndef _LAUNCHER_OUTFIT_EDIT_H_
#define _LAUNCHER_OUTFIT_EDIT_H_

#include "pc/settings.h"

/* a player's colours being chosen in the launcher's popup: a copy, given to
   the player only on Done, so a save or reload meanwhile can't take them */
typedef struct {
  int player_idx;
  int colour_idx; /* which colour the picker is for */
  crash_outfit outfit;
} outfit_edit;

extern void OutfitEditOpen(outfit_edit *edit, const pc_settings *s, int player_idx, int colour_idx);
extern void OutfitEditDone(const outfit_edit *edit, pc_settings *s);
extern void ColourToFloats(uint32_t colour, float rgb[3]);
extern uint32_t ColourFromFloats(const float rgb[3]);

#endif /* _LAUNCHER_OUTFIT_EDIT_H_ */
