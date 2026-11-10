#include "utest.h"
#include "pc/fps.h"

/* count frames every ms_apart ms from start, until ms */
static void CountFramesUntil(fps_counter *c, uint32_t start, uint32_t ms_apart, uint32_t ms) {
  uint32_t now;

  for (now = start; now <= ms; now += ms_apart)
    FpsCountFrame(c, now);
}

UTEST(fps, starts_at_0) {
  fps_counter c;

  FpsReset(&c, 1000);
  ASSERT_EQ(0u, FpsGet(&c));
}

UTEST(fps, counts_frames_drawn_over_a_second) {
  fps_counter c;

  FpsReset(&c, 1000);
  CountFramesUntil(&c, 1010, 10, 2000); /* 100 frames, 10 ms apart */
  ASSERT_EQ(100u, FpsGet(&c));
}

UTEST(fps, keeps_the_last_seconds_count_until_the_next_second_is_up) {
  fps_counter c;

  FpsReset(&c, 0);
  CountFramesUntil(&c, 10, 10, 1000); /* 100 a second */
  CountFramesUntil(&c, 1020, 20, 1500); /* then 50 a second, half a second in */
  ASSERT_EQ(100u, FpsGet(&c));
  CountFramesUntil(&c, 1520, 20, 2000);
  ASSERT_EQ(50u, FpsGet(&c));
}

UTEST(fps, a_slow_second_is_counted_over_how_long_it_took) {
  fps_counter c;

  FpsReset(&c, 0);
  FpsCountFrame(&c, 500);
  FpsCountFrame(&c, 2000); /* 2 frames over 2 seconds */
  ASSERT_EQ(1u, FpsGet(&c));
}
