#include <stddef.h>
#include <string.h>
#include "utest.h"
#include "pbak.h"
#include "globals.h"
#include "level.h"
#include "math.h"
#include "pad.h"
#include "pc/pad.h"
#include "pc/gamepad.h"
#include "pc/gfx/gl.h"

/* what pad.c and pbak.c use, from files the tests don't build */
gool_globals globals;
gl_context context;
gool_object *crash;
gool_handle handles[8];
int draw_count;
extern pbak_header *cur_pbak_header;
extern pbak_frame *cur_pbak_frame;
extern pad pads[2];
extern uint8_t keys[512]; /* test_pad.c's */

static gool_object *event_recipient; /* the last event GoolSendEvent sent, and to whom */
static uint32_t event_sent;

int GoolSendEvent(gool_object *sender, gool_object *recipient, uint32_t event,
  int argc, uint32_t *argv) {
  event_recipient = recipient;
  event_sent = event;
  return 0;
}

gool_object *GoolObjectCreate(void *parent, int exec, int subtype,
  int argc, uint32_t *argv, int flag) {
  return 0;
}

void LevelRestart(level_state *state) {
  draw_count = 0; /* as the game's does */
}

/* the ps1 game's demo entries: a 16 byte header, the saved level state (1276
   bytes), the draw stamp, crash's bound and the ticks per frame, then the
   recorded frames */
#define PBAK_FRAMES_OFFSET 1324

UTEST(pbak, a_demo_entrys_frames_start_where_the_ps1_wrote_them) {
  ASSERT_EQ(PBAK_FRAMES_OFFSET, (int)offsetof(pbak_header, frames));
}

/* a demo with one recorded frame, X held, started as PbakStart starts one */
static void StartDemoHoldingCross(void) {
  static uint8_t entry[sizeof(pbak_header) + sizeof(pbak_frame)];

  memset(keys, 0, sizeof(keys));
  GamepadReleaseAll();
  PadInit(2);
  cur_pbak_header = (pbak_header*)entry;
  cur_pbak_header->frame_count = 1;
  cur_pbak_header->frames[0].held = PAD_CROSS;
  cur_pbak_frame = &cur_pbak_header->frames[0];
  pbak_state = 2;
}

UTEST(pbak, a_playing_demo_holds_its_recorded_buttons) {
  StartDemoHoldingCross();
  PadUpdate();
  ASSERT_EQ((uint32_t)PAD_CROSS, pads[0].held);
}

/* objects (jungle rollers' rollers) time themselves by draw_count, so a demo
   that starts with another count plays against them out of step */
UTEST(pbak, a_started_demo_keeps_its_recorded_draw_count) {
  static uint8_t entry[sizeof(pbak_header)];
  static gool_object demo_crash;

  crash = &demo_crash;
  cur_pbak_header = (pbak_header*)entry;
  cur_pbak_header->draw_count = 194;
  PbakStart();
  ASSERT_EQ(194, draw_count);
}

#define DEMO_OVER_EVENT 0xE00 /* the caption (PRESS START) takes the game back to the title */

UTEST(pbak, a_demo_that_runs_out_tells_its_caption) {
  static gool_object caption;

  StartDemoHoldingCross();
  caption_obj = &caption;
  event_recipient = 0;
  PadUpdate();
  ASSERT_TRUE(event_recipient == &caption && event_sent == DEMO_OVER_EVENT);
}
