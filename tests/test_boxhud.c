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

UTEST(boxhud, the_counter_puts_its_digits_at_the_top_middle) {
  StartLivesCounter();
  BoxHudSetUpCounter(&counter, &source);
  ASSERT_EQ(0, counter.trans.x + HUD_DIGITS_OFFSET_X);
}

static gool_object digits;

/* a counter's digits: its child, an object */
static void AddDigits(gool_object *parent) {
  memset(&digits, 0, sizeof(digits));
  digits.handle.type = 1;
  digits.parent = parent;
}

UTEST(boxhud, the_box_counters_digits_are_smaller_than_the_others_to_fit_between_them) {
  AddDigits(&counter);
  digits.scale.x = HUD_DIGITS_SCALE;
  digits.scale.y = HUD_DIGITS_SCALE;
  digits.scale.z = HUD_DIGITS_SCALE;
  BoxHudSizeDigits(&digits);
  ASSERT_EQ(HUD_DIGITS_SCALE * BOX_HUD_TEXT_PERCENT / 100, digits.scale.x);
  ASSERT_EQ(HUD_DIGITS_SCALE * BOX_HUD_TEXT_PERCENT / 100, digits.scale.y);
  ASSERT_LT(BOX_HUD_TEXT_PERCENT, 100);
}

UTEST(boxhud, the_smaller_digits_drop_by_the_height_they_lose_to_sit_on_the_others_line) {
  int32_t full, smaller;

  full = BoxHudTextHeight(HUD_DIGITS_SCALE);
  smaller = BoxHudTextHeight((HUD_DIGITS_SCALE * BOX_HUD_TEXT_PERCENT) / 100);
  ASSERT_EQ(full - smaller, BoxHudTextDrop());
  ASSERT_GT(BoxHudTextDrop(), 0);
}

UTEST(boxhud, text_height_on_screen_follows_its_scale) {
  ASSERT_EQ(BoxHudTextHeight(HUD_DIGITS_SCALE) / 2, BoxHudTextHeight(HUD_DIGITS_SCALE / 2));
}

UTEST(boxhud, the_box_counters_digits_are_known) {
  StartLivesCounter();
  counter.handle.type = 1;
  BoxHudSetUpCounter(&counter, &source);
  AddDigits(&counter);
  ASSERT_TRUE(BoxHudIsCounterDigits(&digits, &source));
}

UTEST(boxhud, another_counters_digits_arent_the_box_counters) {
  StartLivesCounter();
  counter.handle.type = 1;
  AddDigits(&counter);
  ASSERT_FALSE(BoxHudIsCounterDigits(&digits, &source));
}

UTEST(boxhud, an_object_under_a_handle_isnt_the_box_counters_digits) {
  gool_handle handle;

  memset(&handle, 0, sizeof(handle));
  handle.type = 2;
  AddDigits((gool_object*)&handle);
  ASSERT_FALSE(BoxHudIsCounterDigits(&digits, &source));
}

UTEST(boxhud, an_object_with_no_parent_isnt_the_box_counters_digits) {
  AddDigits(0);
  ASSERT_FALSE(BoxHudIsCounterDigits(&digits, &source));
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
