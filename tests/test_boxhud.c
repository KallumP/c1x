#include "utest.h"
#include "pc/boxhud.h"

/* objects are big (their registers), so not on the stack */
static gool_object counter, source;

/* a lives counter as its start code leaves it, at the top right showing crash's lives */
static void StartLivesCounter() {
  memset(&counter, 0, sizeof(counter));
  memset(&source, 0, sizeof(source));
  counter.trans.x = 0x8200;
  counter.scale.x = 0x1400;
  counter.scale.y = 0x200;
  counter.regs[HUD_SHOWN_REG_IDX] = (HUD_COUNT_REG + 1) << 8;
}

UTEST(boxhud, the_counter_shows_the_source_not_crash) {
  StartLivesCounter();
  BoxHudSetUpCounter(&counter, &source);
  ASSERT_TRUE(counter.player == &source);
  ASSERT_EQ((uint32_t)(HUD_COUNT_REG << 8), counter.regs[HUD_SHOWN_REG_IDX]);
}

UTEST(boxhud, the_counter_sits_at_the_top_middle) {
  StartLivesCounter();
  BoxHudSetUpCounter(&counter, &source);
  ASSERT_EQ(BOX_HUD_X, counter.trans.x);
}

UTEST(boxhud, the_counter_hides_the_lives_head_it_starts_with) {
  StartLivesCounter();
  BoxHudSetUpCounter(&counter, &source);
  ASSERT_EQ(0, counter.scale.x);
  ASSERT_EQ(0, counter.scale.y);
}

UTEST(boxhud, the_counter_starts_on_the_boxes_already_broken_so_it_doesnt_slide_in) {
  StartLivesCounter();
  BoxHudShowBoxes(&source, 12 << 8);
  BoxHudSetUpCounter(&counter, &source);
  ASSERT_EQ(source.regs[HUD_COUNT_REG], counter.regs[HUD_COUNT_REG]);
}

UTEST(boxhud, the_text_is_boxes_broken_out_of_the_total) {
  char text[16];

  BoxHudText(text, sizeof(text), 12, 40);
  ASSERT_STREQ("12/40", text);
}

UTEST(boxhud, the_text_is_just_boxes_broken_in_a_level_with_no_total) {
  char text[16];

  BoxHudText(text, sizeof(text), 3, 0);
  ASSERT_STREQ("3", text);
}

UTEST(boxhud, the_source_holds_the_boxes_broken) {
  memset(&source, 0, sizeof(source));
  BoxHudShowBoxes(&source, 7 << 8);
  ASSERT_EQ((uint32_t)(7 << 8), source.regs[HUD_COUNT_REG]);
}
