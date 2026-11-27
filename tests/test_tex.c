#include "utest.h"
#include "pc/gfx/tex.h"

static texinfo a_texture(void) {
  texinfo t;

  memset(&t, 0, sizeof(t));
  t.type = 1;
  t.tpage = 0x1235;
  t.uv_idx = 37;
  t.segment = 2;
  t.offs_x = 4;
  t.offs_y = 16;
  t.clut_x = 4;
  return t;
}

UTEST(tex, polygons_tinted_differently_share_a_texture) {
  texinfo a = a_texture(), b = a_texture();

  b.r = 0x80;
  b.g = 0x40;
  ASSERT_TRUE(TexturesShareRegion(&a, &b));
}

UTEST(tex, a_culled_and_an_unculled_polygon_share_a_texture) {
  texinfo a = a_texture(), b = a_texture();

  b.no_cull = 1;
  ASSERT_TRUE(TexturesShareRegion(&a, &b));
}

UTEST(tex, textures_with_different_palettes_are_different) {
  texinfo a = a_texture(), b = a_texture();

  b.clut_x = 1;
  ASSERT_FALSE(TexturesShareRegion(&a, &b));
}

UTEST(tex, textures_in_different_places_are_different) {
  texinfo a = a_texture(), b = a_texture();

  b.offs_y = 8;
  ASSERT_FALSE(TexturesShareRegion(&a, &b));
}

UTEST(tex, textures_of_different_shapes_are_different) {
  texinfo a = a_texture(), b = a_texture();

  b.uv_idx = 62;
  ASSERT_FALSE(TexturesShareRegion(&a, &b));
}

UTEST(tex, textures_blended_differently_are_different) {
  texinfo a = a_texture(), b = a_texture();

  b.semi_trans = 1;
  ASSERT_FALSE(TexturesShareRegion(&a, &b));
}

UTEST(tex, textures_from_different_pages_are_different) {
  texinfo a = a_texture(), b = a_texture();

  b.tpage = 0x1237;
  ASSERT_FALSE(TexturesShareRegion(&a, &b));
}
