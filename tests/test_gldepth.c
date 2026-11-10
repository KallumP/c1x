#include "utest.h"
#include "pc/gfx/gldepth.h"

/* the ps1's blend modes, a prim's low 2 flag bits */
#define BLEND_AVERAGE     0 /* half the background plus half the prim */
#define BLEND_ADD         1
#define BLEND_SUBTRACT    2
#define BLEND_ADD_QUARTER 3 /* the background plus a quarter of the prim */

/* GLPrimLevelWritesDepth's and GLPrimModelDepthTested's flags */
#define ORIGINAL_LEVEL 0
#define CUSTOM_LEVEL   1
#define FIX_MODEL_DRAW_ORDER_OFF 0
#define FIX_MODEL_DRAW_ORDER_ON  1

UTEST(gldepth, nearer_vertex_has_smaller_depth) {
  ASSERT_LT(GLDepthFromZ(1000), GLDepthFromZ(2000));
}

UTEST(gldepth, depth_is_linear_in_1_over_z) {
  /* 1 - near/z, so twice and four times the near distance give 1/2 and 3/4 */
  ASSERT_EQ(0.5f, GLDepthFromZ(GL_DEPTH_NEAR*2));
  ASSERT_EQ(0.75f, GLDepthFromZ(GL_DEPTH_NEAR*4));
}

UTEST(gldepth, depth_at_or_before_near_is_0) {
  ASSERT_EQ(0.0f, GLDepthFromZ(GL_DEPTH_NEAR));
  ASSERT_EQ(0.0f, GLDepthFromZ(1));
  ASSERT_EQ(0.0f, GLDepthFromZ(-5));
}

UTEST(gldepth, furthest_depth_is_below_1) {
  ASSERT_LT(GLDepthFromZ(0xFFFF), 1.0f);
}

UTEST(gldepth, marked_prim_is_depth_tested) {
  ASSERT_TRUE(GLPrimDepthTested(GL_PRIM_DEPTH | BLEND_ADD_QUARTER));
  ASSERT_FALSE(GLPrimDepthTested(BLEND_ADD_QUARTER));
}

UTEST(gldepth, depth_mark_does_not_change_blend_mode) {
  ASSERT_EQ(BLEND_AVERAGE, GLPrimBlendMode(GL_PRIM_DEPTH | BLEND_AVERAGE));
  ASSERT_EQ(BLEND_ADD, GLPrimBlendMode(GL_PRIM_DEPTH | BLEND_ADD));
  ASSERT_EQ(BLEND_SUBTRACT, GLPrimBlendMode(BLEND_SUBTRACT));
  ASSERT_EQ(BLEND_ADD_QUARTER, GLPrimBlendMode(GL_PRIM_DEPTH | BLEND_ADD_QUARTER));
}

UTEST(gldepth, marked_opaque_prims_write_depth) {
  ASSERT_TRUE(GLPrimWritesDepth(GL_PRIM_DEPTH | BLEND_AVERAGE));
  ASSERT_TRUE(GLPrimWritesDepth(GL_PRIM_DEPTH | BLEND_ADD_QUARTER));
}

UTEST(gldepth, additive_and_subtractive_prims_do_not_write_depth) {
  ASSERT_FALSE(GLPrimWritesDepth(GL_PRIM_DEPTH | BLEND_ADD));
  ASSERT_FALSE(GLPrimWritesDepth(GL_PRIM_DEPTH | BLEND_SUBTRACT));
}

UTEST(gldepth, unmarked_prims_do_not_write_depth) {
  ASSERT_FALSE(GLPrimWritesDepth(BLEND_ADD_QUARTER));
}

UTEST(gldepth, level_mark_is_not_a_model) {
  ASSERT_FALSE(GLPrimDepthTested(GL_PRIM_LEVEL | BLEND_ADD_QUARTER));
  ASSERT_FALSE(GLPrimWritesDepth(GL_PRIM_LEVEL | BLEND_AVERAGE));
}

UTEST(gldepth, level_mark_does_not_change_blend_mode) {
  ASSERT_EQ(BLEND_AVERAGE, GLPrimBlendMode(GL_PRIM_LEVEL | BLEND_AVERAGE));
  ASSERT_EQ(BLEND_ADD_QUARTER, GLPrimBlendMode(GL_PRIM_LEVEL | BLEND_ADD_QUARTER));
}

UTEST(gldepth, marked_level_prims_write_depth_in_custom_levels) {
  ASSERT_TRUE(GLPrimLevelWritesDepth(GL_PRIM_LEVEL | BLEND_AVERAGE, CUSTOM_LEVEL));
  ASSERT_TRUE(GLPrimLevelWritesDepth(GL_PRIM_LEVEL | BLEND_ADD_QUARTER, CUSTOM_LEVEL));
}

UTEST(gldepth, level_prims_do_not_write_depth_in_original_levels) {
  ASSERT_FALSE(GLPrimLevelWritesDepth(GL_PRIM_LEVEL | BLEND_AVERAGE, ORIGINAL_LEVEL));
}

UTEST(gldepth, unmarked_and_effect_level_prims_do_not_write_depth) {
  ASSERT_FALSE(GLPrimLevelWritesDepth(BLEND_AVERAGE, CUSTOM_LEVEL));
  ASSERT_FALSE(GLPrimLevelWritesDepth(GL_PRIM_LEVEL | BLEND_ADD, CUSTOM_LEVEL));
  ASSERT_FALSE(GLPrimLevelWritesDepth(GL_PRIM_LEVEL | BLEND_SUBTRACT, CUSTOM_LEVEL));
}

UTEST(gldepth, models_arent_tested_in_original_levels_without_the_setting) {
  ASSERT_FALSE(GLPrimModelDepthTested(GL_PRIM_DEPTH, FIX_MODEL_DRAW_ORDER_OFF, ORIGINAL_LEVEL));
}

UTEST(gldepth, models_are_tested_with_the_setting) {
  ASSERT_TRUE(GLPrimModelDepthTested(GL_PRIM_DEPTH, FIX_MODEL_DRAW_ORDER_ON, ORIGINAL_LEVEL));
}

UTEST(gldepth, models_are_tested_in_custom_levels) {
  ASSERT_TRUE(GLPrimModelDepthTested(GL_PRIM_DEPTH, FIX_MODEL_DRAW_ORDER_OFF, CUSTOM_LEVEL));
}

UTEST(gldepth, level_tri_in_front_of_the_camera_has_depth) {
  ASSERT_TRUE(GLLevelTriHasDepth(400, 500, 600, 300));
}

UTEST(gldepth, level_tri_with_a_corner_the_gte_saturated_has_no_depth) {
  /* a corner at or under half the projection distance is pushed to the
     side of the screen (see gte.h), so depths across the tri are wrong */
  ASSERT_FALSE(GLLevelTriHasDepth(150, 500, 600, 300));
  ASSERT_FALSE(GLLevelTriHasDepth(400, 0, 600, 300));
  ASSERT_TRUE(GLLevelTriHasDepth(400, 151, 600, 300));
}
