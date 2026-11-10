#include "spin.h"

/* frames of spin charge crash has: frames since his stamp, capped; none if the stamp is ahead */
static int32_t SpinCharge(uint32_t frames_elapsed, uint32_t spin_stamp) {
  int32_t charge;

  charge = (int32_t)(frames_elapsed - spin_stamp);
  if (charge < 0) { return 0; }
  if (charge > SPIN_CHARGE_CAP) { return SPIN_CHARGE_CAP; }
  return charge;
}

/* how many spins crash has left, from frames_elapsed and his spin stamp */
int SpinsLeft(uint32_t frames_elapsed, uint32_t spin_stamp) {
  return SpinCharge(frames_elapsed, spin_stamp) / SPIN_COST;
}

/* frames until crash's next spin refills, or 0 if he has them all */
int SpinRefillFrames(uint32_t frames_elapsed, uint32_t spin_stamp) {
  return 0;
}

/* frames as tenths of a second, rounded up */
int SpinFramesAsTenths(int frames) {
  return 0;
}
