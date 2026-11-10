#ifndef _PC_SPIN_H_
#define _PC_SPIN_H_

#include "common.h"

/*
 * crash's spin charge (pc), as his gool code (WillC) keeps it: the charge is
 * frames_elapsed less his spin stamp, capped at SPIN_CHARGE_CAP. a spin needs
 * and uses SPIN_COST frames of it, so it refills a spin every 2 seconds
 */
#define SPIN_COST         60   /* frames of charge a spin uses */
#define SPIN_CHARGE_CAP   300  /* most frames of charge he keeps (5 spins) */
#define SPIN_STAMP_MEMORY 14   /* his spin stamp: memory[14] */

extern int SpinsLeft(uint32_t frames_elapsed, uint32_t spin_stamp);
extern int SpinRefillFrames(uint32_t frames_elapsed, uint32_t spin_stamp);
extern int SpinFramesAsTenths(int frames);

#endif /* _PC_SPIN_H_ */
