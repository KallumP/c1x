#ifndef _PC_SWITCHCHAIN_H_
#define _PC_SWITCHCHAIN_H_

#include <stdint.h>

/*
 * a switch in another switch's chain (pc): a switch's init flag c is the id of
 * the first box of its chain, and each box filled in sends the fill on to the
 * next by its own flag c. a switch filled in by a chain (a custom level's
 * switch that's an outline of another) would pass the fill on into its own
 * chain at once, so its boxes would fill in before it's hit. the fill it
 * passes on after being filled in is stopped instead; once hit, it passes
 * the fill on as ever. no original level has a switch in a chain
 */
#define SWITCH_CHAIN_FILL       0x800 /* the event a box sends the next box of its chain */
#define SWITCH_CHAIN_BOX_TYPE   34
#define SWITCH_CHAIN_SWITCH     7     /* a box's subtype as a switch */
#define SWITCH_CHAIN_STOP_COUNT 16    /* switches filled in at once, waiting to pass it on */

typedef struct {
  uint16_t ids[SWITCH_CHAIN_STOP_COUNT]; /* the switches whose next fill is stopped (0 for none) */
} switch_chain_stops;

static inline int SwitchChainIsFill(uint32_t event) {
  return event == SWITCH_CHAIN_FILL;
}

static inline int SwitchChainIsSwitch(uint8_t type, uint8_t subtype) {
  return type == SWITCH_CHAIN_BOX_TYPE && subtype == SWITCH_CHAIN_SWITCH;
}

/* where id is among the stopped switches (or 0, for a free place); -1 if nowhere */
static inline int SwitchChainFind(switch_chain_stops *stops, uint16_t id) {
  int i;

  for (i=0;i<SWITCH_CHAIN_STOP_COUNT;i++) {
    if (stops->ids[i] == id) { return i; }
  }
  return -1;
}

/* a box filled in by its chain: a switch with a chain of its own stops the fill it would pass on */
static inline void SwitchChainFilled(switch_chain_stops *stops, uint8_t type, uint8_t subtype,
  uint16_t id, int16_t next) {
  int free_place;

  if (!SwitchChainIsSwitch(type, subtype) || next == 0) { return; }
  if (SwitchChainFind(stops, id) != -1) { return; }
  free_place = SwitchChainFind(stops, 0);
  if (free_place != -1) { stops->ids[free_place] = id; }
}

/* whether a box's fill is stopped there (only once: after that, the switch is hit) */
static inline int SwitchChainStopsFill(switch_chain_stops *stops, uint8_t type, uint8_t subtype,
  uint16_t id) {
  int place;

  if (!SwitchChainIsSwitch(type, subtype)) { return 0; }
  place = SwitchChainFind(stops, id);
  if (place == -1) { return 0; }
  stops->ids[place] = 0;
  return 1;
}

#endif /* _PC_SWITCHCHAIN_H_ */
