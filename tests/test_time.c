#include "utest.h"
#include <SDL2/SDL.h>
#include "pc/time.h"

/* the game's clock runs at 34000000/0x8000 (about 1037.6) ticks a second */
#define TICKS_A_SECOND_TIMES_0x8000 34000000LL

/* the whole ticks in a number of seconds */
static int32_t TicksIn(int64_t seconds) {
  return (int32_t)(seconds * TICKS_A_SECOND_TIMES_0x8000 / 0x8000);
}

UTEST(time, fixed_clock_does_not_move_on_its_own) {
  TimeSetFixed(1);
  SetTicksElapsed(100);
  SDL_Delay(20);
  ASSERT_EQ(100, GetTicksElapsed());
  TimeSetFixed(0);
}

UTEST(time, fixed_clock_advances_when_told) {
  TimeSetFixed(1);
  SetTicksElapsed(100);
  TimeAdvance(34);
  ASSERT_EQ(134, GetTicksElapsed());
  TimeAdvance(34);
  ASSERT_EQ(168, GetTicksElapsed());
  TimeSetFixed(0);
}

UTEST(time, real_clock_carries_on_from_the_fixed_one) {
  int ticks;

  TimeSetFixed(1);
  SetTicksElapsed(5000);
  TimeSetFixed(0);
  ticks = GetTicksElapsed();
  ASSERT_GE(ticks, 5000);
  ASSERT_LT(ticks, 5100);
}

UTEST(time, waiting_a_frame_moves_the_fixed_clock_on_one_frame) {
  uint32_t start_ms;

  TimeSetFixed(1);
  SetTicksElapsed(100);
  TimeWaitFrame(34);
  start_ms = SDL_GetTicks();
  TimeWaitFrame(34);
  ASSERT_EQ(168, GetTicksElapsed());
  ASSERT_GE(SDL_GetTicks() - start_ms, 25u); /* 34 ticks is about 33ms */
  TimeSetFixed(0);
}

UTEST(time, faster_speed_waits_less_but_moves_a_whole_frame) {
  uint32_t start_ms;

  TimeSetFixed(1);
  SetTicksElapsed(100);
  TimeSetSpeed(4);
  TimeWaitFrame(34);
  start_ms = SDL_GetTicks();
  TimeWaitFrame(34);
  ASSERT_LT(SDL_GetTicks() - start_ms, 20u); /* about 8ms, not 33 */
  TimeSetSpeed(1);
  TimeSetFixed(0);
}

UTEST(time, speed_0_does_not_wait) {
  uint32_t start_ms;
  int i;

  TimeSetFixed(1);
  SetTicksElapsed(100);
  TimeSetSpeed(0);
  start_ms = SDL_GetTicks();
  for (i=0;i<10;i++)
    TimeWaitFrame(34);
  ASSERT_EQ(100 + 340, GetTicksElapsed());
  ASSERT_LT(SDL_GetTicks() - start_ms, 20u); /* 10 frames would be 330ms */
  TimeSetSpeed(1);
  TimeSetFixed(0);
}

UTEST(time, counter_converts_to_ticks) {
  ASSERT_EQ(0, TimeTicksFromCount(0, 10000000));
  ASSERT_EQ(TicksIn(1), TimeTicksFromCount(10000000, 10000000)); /* a second */
  ASSERT_EQ(TicksIn(1), TimeTicksFromCount(3000000, 3000000)); /* at another frequency */
}

#define TEN_HOURS               (10LL * 60 * 60) /* seconds */
#define NEARLY_TWENTY_FOUR_DAYS 2063889LL /* seconds; nearly as many ticks as an int32 holds */

UTEST(time, counter_converts_without_overflow_after_hours_of_uptime) {
  /* 10 hours of a 10 MHz performance counter overflowed 1000000*count*34
     (int64) and gave negative ticks, so the first frame waited for hours */
  int64_t freq = 10000000;

  ASSERT_EQ(TicksIn(TEN_HOURS), TimeTicksFromCount(TEN_HOURS*freq, freq));
  ASSERT_EQ(TicksIn(NEARLY_TWENTY_FOUR_DAYS), TimeTicksFromCount(NEARLY_TWENTY_FOUR_DAYS*freq, freq));
}

UTEST(time, real_clock_starts_near_0) {
  /* ticks count from the game starting, not the machine, so they stay
     small and positive however long it has been up */
  int ticks;

  TimeSetFixed(0);
  ticks = TimeRealTicks();
  ASSERT_GE(ticks, 0);
  ASSERT_LT(ticks, TicksIn(60)); /* within a minute of the tests starting */
}

/* what WaitCallback saw */
static int wait_calls;
static int32_t wait_last_elapsed, wait_last_ticks;

static void WaitCallback(int32_t elapsed, int32_t ticks) {
  wait_calls++;
  wait_last_elapsed = elapsed;
  wait_last_ticks = ticks;
}

UTEST(time, waiting_a_frame_calls_back_with_the_ticks_waited_so_far) {
  TimeSetFixed(1);
  SetTicksElapsed(100);
  TimeWaitFrame(34);
  wait_calls = 0;
  TimeWaitFrameWith(34, WaitCallback);
  ASSERT_GT(wait_calls, 1);
  ASSERT_EQ(34, wait_last_ticks);
  ASSERT_LT(wait_last_elapsed, 34);
  ASSERT_GE(wait_last_elapsed, 25); /* called until the frame is nearly up */
  ASSERT_EQ(168, GetTicksElapsed());
  TimeSetFixed(0);
}
