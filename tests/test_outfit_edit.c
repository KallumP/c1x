#include "utest.h"
#include "launcher/outfit_edit.h"

#define GREEN 0x00FF00

UTEST(outfit_edit, it_starts_from_the_players_colours) {
  pc_settings s;
  outfit_edit edit;

  SettingsReset(&s);
  OutfitEditOpen(&edit, &s, 1, OUTFIT_COLOUR_HAIR);
  ASSERT_TRUE(OutfitsEqual(&edit.outfit, &s.outfits[1]));
}

UTEST(outfit_edit, it_starts_on_the_colour_its_opened_on) {
  pc_settings s;
  outfit_edit edit;

  SettingsReset(&s);
  OutfitEditOpen(&edit, &s, 1, OUTFIT_COLOUR_HAIR);
  ASSERT_EQ(OUTFIT_COLOUR_HAIR, edit.colour_idx);
}

UTEST(outfit_edit, the_players_colours_stay_as_they_were_while_editing) {
  pc_settings s;
  outfit_edit edit;

  SettingsReset(&s);
  OutfitEditOpen(&edit, &s, 0, OUTFIT_COLOUR_FUR);
  edit.outfit.fur = GREEN;
  ASSERT_EQ((uint32_t)CRASH_FUR_COLOR, s.outfits[0].fur);
}

UTEST(outfit_edit, done_gives_the_player_the_edited_colours) {
  pc_settings s;
  outfit_edit edit;

  SettingsReset(&s);
  OutfitEditOpen(&edit, &s, 1, OUTFIT_COLOUR_FUR);
  edit.outfit.fur = GREEN;
  OutfitEditDone(&edit, &s);
  ASSERT_EQ((uint32_t)GREEN, s.outfits[1].fur);
}

UTEST(outfit_edit, done_leaves_the_other_player) {
  pc_settings s;
  outfit_edit edit;

  SettingsReset(&s);
  OutfitEditOpen(&edit, &s, 1, OUTFIT_COLOUR_FUR);
  edit.outfit.fur = GREEN;
  OutfitEditDone(&edit, &s);
  ASSERT_EQ((uint32_t)CRASH_FUR_COLOR, s.outfits[0].fur);
}

UTEST(outfit_edit, every_channel_value_survives_the_pickers_floats) {
  float rgb[3];
  uint32_t channel, colour;

  for (channel=0;channel<=0xFF;channel++) {
    colour = (channel << 16) | ((0xFF - channel) << 8) | (channel / 2);
    ColourToFloats(colour, rgb);
    ASSERT_EQ(colour, ColourFromFloats(rgb));
  }
}

UTEST(outfit_edit, floats_beyond_the_pickers_range_are_clamped) {
  float rgb[3] = { 1.5f, -0.5f, 1.0f };

  ASSERT_EQ((uint32_t)0xFF00FF, ColourFromFloats(rgb));
}
