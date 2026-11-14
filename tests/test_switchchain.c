#include "utest.h"
#include "pc/switchchain.h"

#define BOX 34
#define SWITCH 7
#define PLAIN 0

UTEST(switchchain, a_switch_filled_in_by_a_chain_stops_the_fill_it_would_pass_on) {
  switch_chain_stops stops = { 0 };

  SwitchChainFilled(&stops, BOX, SWITCH, 8, 7);
  ASSERT_TRUE(SwitchChainStopsFill(&stops, BOX, SWITCH, 8));
}

UTEST(switchchain, once_stopped_the_switch_passes_its_fill_on_when_hit) {
  switch_chain_stops stops = { 0 };

  SwitchChainFilled(&stops, BOX, SWITCH, 8, 7);
  SwitchChainStopsFill(&stops, BOX, SWITCH, 8);
  ASSERT_FALSE(SwitchChainStopsFill(&stops, BOX, SWITCH, 8));
}

UTEST(switchchain, a_switch_never_filled_in_passes_its_fill_on) {
  switch_chain_stops stops = { 0 };

  SwitchChainFilled(&stops, BOX, SWITCH, 8, 7);
  ASSERT_FALSE(SwitchChainStopsFill(&stops, BOX, SWITCH, 5));
}

UTEST(switchchain, other_boxes_pass_the_fill_on) {
  switch_chain_stops stops = { 0 };

  SwitchChainFilled(&stops, BOX, PLAIN, 6, 8);
  ASSERT_FALSE(SwitchChainStopsFill(&stops, BOX, PLAIN, 6));
}

UTEST(switchchain, a_switch_with_no_chain_of_its_own_has_nothing_to_stop) {
  switch_chain_stops stops = { 0 };

  SwitchChainFilled(&stops, BOX, SWITCH, 8, 0);
  ASSERT_FALSE(SwitchChainStopsFill(&stops, BOX, SWITCH, 8));
  SwitchChainFilled(&stops, BOX, SWITCH, 9, 7); /* and it took no room from one that has */
  ASSERT_TRUE(SwitchChainStopsFill(&stops, BOX, SWITCH, 9));
}

UTEST(switchchain, a_switch_filled_in_twice_stops_one_fill) {
  switch_chain_stops stops = { 0 };

  SwitchChainFilled(&stops, BOX, SWITCH, 8, 7);
  SwitchChainFilled(&stops, BOX, SWITCH, 8, 7);
  ASSERT_TRUE(SwitchChainStopsFill(&stops, BOX, SWITCH, 8));
  ASSERT_FALSE(SwitchChainStopsFill(&stops, BOX, SWITCH, 8));
}

UTEST(switchchain, several_switches_are_stopped_at_once) {
  switch_chain_stops stops = { 0 };

  SwitchChainFilled(&stops, BOX, SWITCH, 8, 7);
  SwitchChainFilled(&stops, BOX, SWITCH, 9, 10);
  ASSERT_TRUE(SwitchChainStopsFill(&stops, BOX, SWITCH, 9));
  ASSERT_TRUE(SwitchChainStopsFill(&stops, BOX, SWITCH, 8));
}

UTEST(switchchain, only_the_chains_fill_event_is_stopped) {
  ASSERT_TRUE(SwitchChainIsFill(0x800));
  ASSERT_FALSE(SwitchChainIsFill(0x900));
}
