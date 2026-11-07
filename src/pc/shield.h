#ifndef _PC_SHIELD_H_
#define _PC_SHIELD_H_

#include "common.h"
#include "geom.h"

/*
 * a native's shield push (pc): walking into a native's shield (The Great
 * Gate's SheNC) sets crash moving away from it along the game's x, the way
 * its path runs in The Great Gate. a custom level's native can walk any
 * way, so there the push is turned to lie along the native's own path
 */
#define SHIELD_PUSH_SPEED      0xFA000 /* how fast the shield sets crash moving (its code's ireg[0x20]) */
#define SHIELD_HEADING_PLUS_X  0x400   /* crash's heading (target_rot.x) when pushed along +x */
#define SHIELD_HEADING_MINUS_X 0xC00   /* and along -x */
#define SHIELD_PATH_START      3       /* the native's memory slots holding its path's start, then its end */
#define SHIELD_PATH_END        6

/* whether crash's motion (velocity and heading) is a shield push just made:
   changed from what it was before, along the game's x at the shield's speed,
   heading the way he goes */
static inline int ShieldPushed(vec *velocity_before, int32_t heading_before, vec *velocity, int32_t heading) {
  int unchanged, pushing_plus, pushing_minus;

  unchanged = velocity->x == velocity_before->x && velocity->z == velocity_before->z && heading == heading_before;
  pushing_plus = velocity->x == SHIELD_PUSH_SPEED && heading == SHIELD_HEADING_PLUS_X;
  pushing_minus = velocity->x == -SHIELD_PUSH_SPEED && heading == SHIELD_HEADING_MINUS_X;
  return !unchanged && velocity->z == 0 && (pushing_plus || pushing_minus);
}

/* the way (across the ground; its length doesn't matter) a native at native,
   walking a path from start to end, pushes crash, at crash: along its path,
   away from it. a path with no length across the ground pushes along the
   game's x, as the game does */
static inline vec ShieldPushWay(vec *native, vec *crash, vec *start, vec *end) {
  vec way = { 0 };
  int64_t along;

  way.x = end->x - start->x;
  way.z = end->z - start->z;
  if (way.x == 0 && way.z == 0) { way.x = 1; }
  along = (int64_t)(crash->x - native->x)*way.x + (int64_t)(crash->z - native->z)*way.z;
  if (along < 0) {
    way.x = -way.x;
    way.z = -way.z;
  }
  return way;
}

#endif /* _PC_SHIELD_H_ */
