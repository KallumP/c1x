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
