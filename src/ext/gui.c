/**
 * the game's in-game gui: the text in the top right corner (see GuiCornerOverlay)
 */
#include "./ext/gui.h"
#include "./ext/lib/gui.h"

#include "gool.h"
#include "globals.h"
#include "pc/gfx/gl.h"
#include "pc/settings.h"
#include "pc/speed.h"
#include "pc/fps.h"
#include "pc/spin.h"
#include "pc/replay.h"

extern uint32_t frames_elapsed; /* gool.c */

extern gool_object *crash;
extern gl_context context;

void GuiInit() {
  GuiIgInit();
}

/* what goes before a corner text line: a line break, unless it's the first */
static const char *GuiLineBreak(int len) {
  if (len) { return "\n"; }
  return "";
}

static int GuiIsCrashPlaying() {
  return game_state == GAME_STATE_PLAYING && crash;
}

/* how many spins crash has left, or 0 when he isn't playing */
static int GuiCrashSpinsLeft() {
  if (!GuiIsCrashPlaying()) { return 0; }
  return SpinsLeft(frames_elapsed, crash->memory[SPIN_STAMP_MEMORY]);
}

/* tenths of a second until crash's next spin refills, or 0 */
static int GuiCrashSpinRefillTenths() {
  if (!GuiIsCrashPlaying()) { return 0; }
  return SpinFramesAsTenths(SpinRefillFrames(frames_elapsed, crash->memory[SPIN_STAMP_MEMORY]));
}

/* the spin display's lines: spins left, and seconds until the next refills */
static int GuiSpinText(char *text, size_t size, const char *line_break) {
  int tenths;

  tenths = GuiCrashSpinRefillTenths();
  return snprintf(text, size, "%sspins %6d\nrefill %3d.%d", line_break,
    GuiCrashSpinsLeft(), tenths / 10, tenths % 10);
}

/*
 * text in the top right corner: REPLAYING INPUTS while replaying recorded inputs,
 * the frames drawn a second when fps_display is on in settings.cfg,
 * crash's speed when speed_display is on, and his spins left (and when the next
 * refills) when spin_display is on
 */
static void GuiCornerOverlay() {
  static speed_tracker crash_speed;
  gool_object *obj;
  uint32_t speed;
  char text[128];
  int len;

  len = 0;
  text[0] = 0;
  if (ReplayIsPlaying())
    len += snprintf(text, sizeof(text), "REPLAYING INPUTS");
  if (game_settings.fps_display)
    len += snprintf(&text[len], sizeof(text) - len, "%sfps   %6u", GuiLineBreak(len), FpsShown());
  if (game_settings.speed_display) {
    obj = game_state == GAME_STATE_PLAYING ? crash : 0;
    /* same frame time as GoolObjectPhysics, so open running matches velocity */
    speed = SpeedTrack(&crash_speed, obj, obj ? &obj->trans : 0,
      min(context.ticks_per_frame, 0x66));
    /* total horizontal speed, then the signed speed along each axis (y is up) */
    len += snprintf(&text[len], sizeof(text) - len,
      "%sspeed %6u\nx     %6d\ny     %6d\nz     %6d", GuiLineBreak(len),
      speed, crash_speed.x, crash_speed.y, crash_speed.z);
  }
  if (game_settings.spin_display)
    GuiSpinText(&text[len], sizeof(text) - len, GuiLineBreak(len));
  if (text[0])
    GuiIgCornerText(text);
}

/* the corner text, the only gui the game shows */
void GuiDraw() {
  GuiIgDraw(0, GuiCornerOverlay);
}
