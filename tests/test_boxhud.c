#include "utest.h"
#include "pc/boxhud.h"

/* the plain crate's front face, as its tgeo keeps it: a dim colour, its texture page and its region */
static tgeo_texinfo CrateFace() {
  tgeo_texinfo face;

  memset(&face, 0, sizeof(face));
  face.r = 0x59; face.g = 0x59; face.b = 0x59;
  face.type = 1;
  face.semi_trans = 2;
  face.tpage = 0x1234;
  face.uv_idx = 0x1c8;
  face.offs_x = 7;
  face.clut_y = 0x2a;
  return face;
}

/* objects are big (their registers), so not on the stack */
static gool_object counter, source;
static box_hud_icon icon;

#define WUMPA_SCALE 0x1400 /* the wumpa counter's icon scale */

/* a lives counter as its start code leaves it, at the top right showing crash's lives */
static void StartLivesCounter() {
  memset(&counter, 0, sizeof(counter));
  memset(&source, 0, sizeof(source));
  counter.trans.x = 0x8200;
  counter.regs[HUD_SHOWN_REG_IDX] = (HUD_COUNT_REG + 1) << 8;
  counter.anim_frame = 0x300;
}

UTEST(boxhud, the_counter_shows_the_source_not_crash) {
  StartLivesCounter();
  BoxHudSetUpCounter(&counter, &source, &icon, WUMPA_SCALE);
  ASSERT_TRUE(counter.player == &source);
  ASSERT_EQ((uint32_t)(HUD_COUNT_REG << 8), counter.regs[HUD_SHOWN_REG_IDX]);
}

UTEST(boxhud, the_counter_sits_at_the_top_middle) {
  StartLivesCounter();
  BoxHudSetUpCounter(&counter, &source, &icon, WUMPA_SCALE);
  ASSERT_EQ(BOX_HUD_X, counter.trans.x);
}

UTEST(boxhud, the_counter_shows_the_crate_icon) {
  StartLivesCounter();
  BoxHudSetUpCounter(&counter, &source, &icon, WUMPA_SCALE);
  ASSERT_TRUE(counter.anim_seq == (gool_anim*)&icon);
  ASSERT_EQ(0u, counter.anim_frame);
}

UTEST(boxhud, the_crate_icon_is_as_wide_as_the_wumpa) {
  StartLivesCounter();
  BoxHudSetUpCounter(&counter, &source, &icon, WUMPA_SCALE);
  ASSERT_EQ(WUMPA_SCALE, counter.scale.x);
}

UTEST(boxhud, the_crate_icon_is_square) {
  StartLivesCounter();
  BoxHudSetUpCounter(&counter, &source, &icon, WUMPA_SCALE);
  ASSERT_EQ(WUMPA_SCALE, counter.scale.y);
}

UTEST(boxhud, the_counter_starts_on_the_boxes_already_broken_so_it_doesnt_slide_in) {
  StartLivesCounter();
  BoxHudShowBoxes(&source, 12 << 8);
  BoxHudSetUpCounter(&counter, &source, &icon, WUMPA_SCALE);
  ASSERT_EQ(source.regs[HUD_COUNT_REG], counter.regs[HUD_COUNT_REG]);
}

UTEST(boxhud, the_source_holds_the_boxes_broken) {
  memset(&source, 0, sizeof(source));
  BoxHudShowBoxes(&source, 7 << 8);
  ASSERT_EQ((uint32_t)(7 << 8), source.regs[HUD_COUNT_REG]);
}

UTEST(boxhud, the_icon_is_a_one_frame_sprite) {
  box_hud_icon icon;
  tgeo_texinfo face = CrateFace();

  BoxHudMakeIcon(&icon, &face);
  ASSERT_EQ(GOOL_ANIM_TYPE_SPRITE, icon.type);
  ASSERT_EQ(1, icon.length);
}

UTEST(boxhud, the_icon_shows_the_crate_faces_texture) {
  box_hud_icon icon;
  tgeo_texinfo face = CrateFace();

  BoxHudMakeIcon(&icon, &face);
  ASSERT_EQ(face.tpage, icon.tpage);
  ASSERT_EQ(face.uv_idx, icon.texinfo.uv_idx);
  ASSERT_EQ(face.offs_x, icon.texinfo.offs_x);
  ASSERT_EQ(face.clut_y, icon.texinfo.clut_y);
  ASSERT_EQ(face.type, icon.texinfo.type);
  ASSERT_EQ(face.semi_trans, icon.texinfo.semi_trans);
}

UTEST(boxhud, the_icon_is_drawn_in_its_own_colours_not_the_faces_shading) {
  box_hud_icon icon;
  tgeo_texinfo face = CrateFace();

  BoxHudMakeIcon(&icon, &face);
  ASSERT_EQ(BOX_HUD_ICON_SHADE, icon.texinfo.r);
  ASSERT_EQ(BOX_HUD_ICON_SHADE, icon.texinfo.g);
  ASSERT_EQ(BOX_HUD_ICON_SHADE, icon.texinfo.b);
}
