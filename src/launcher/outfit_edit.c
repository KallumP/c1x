#include "outfit_edit.h"

void OutfitEditOpen(outfit_edit *edit, const pc_settings *s, int player_idx, int colour_idx) {
  edit->player_idx = player_idx;
  edit->colour_idx = colour_idx;
  edit->outfit = s->outfits[player_idx];
}

void OutfitEditDone(const outfit_edit *edit, pc_settings *s) {
  s->outfits[edit->player_idx] = edit->outfit;
}

static float ChannelToFloat(uint32_t colour, int shift) {
  return ((colour >> shift) & 0xFF) / 255.0f;
}

static uint32_t FloatToChannel(float channel, int shift) {
  if (channel < 0) { channel = 0; }
  if (channel > 1) { channel = 1; }
  return (uint32_t)((channel * 255.0f) + 0.5f) << shift;
}

void ColourToFloats(uint32_t colour, float rgb[3]) {
  rgb[0] = ChannelToFloat(colour, 16);
  rgb[1] = ChannelToFloat(colour, 8);
  rgb[2] = ChannelToFloat(colour, 0);
}

uint32_t ColourFromFloats(const float rgb[3]) {
  return FloatToChannel(rgb[0], 16) | FloatToChannel(rgb[1], 8) | FloatToChannel(rgb[2], 0);
}
