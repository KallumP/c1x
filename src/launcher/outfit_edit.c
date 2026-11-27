#include "outfit_edit.h"

void OutfitEditOpen(outfit_edit *edit, const pc_settings *s, int player_idx, int colour_idx) {
}

void OutfitEditDone(const outfit_edit *edit, pc_settings *s) {
}

void ColourToFloats(uint32_t colour, float rgb[3]) {
  rgb[0] = rgb[1] = rgb[2] = 0;
}

uint32_t ColourFromFloats(const float rgb[3]) {
  return 0;
}
