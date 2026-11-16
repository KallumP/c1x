#ifndef _PC_JUMPGRACE_H_
#define _PC_JUMPGRACE_H_

#include "common.h"

/*
 * a jump just after leaving the floor (pc): walking off a ledge, crash's
 * gool code still lets him jump for 5 frames, but a spin's jump needs him on
 * the floor that very frame, so a spin that carries him off a ledge loses a
 * jump pressed a moment later. for those first frames off the floor, while
 * he isn't rising, a tapped jump counts him as on the floor, as walking does
 */
#define JUMP_GRACE_FRAMES 5       /* frames off the floor a jump still counts */
#define JUMP_GRACE_FLOOR  0x40001 /* his status_a bits for being on the floor */
#define JUMP_GRACE_BUTTON 0x40    /* the jump button (X) */

typedef struct {
  int frames_off_floor; /* frames since crash was last on the floor */
} jump_grace;

extern void JumpGraceTrackFloor(jump_grace *grace, int on_floor);
extern int JumpGraceCountsAsFloor(const jump_grace *grace, int32_t velocity_y,
  uint32_t tapped);

#endif /* _PC_JUMPGRACE_H_ */
