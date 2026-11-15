/**
 * the game's in-game gui: the text in the top right corner (see GuiCornerOverlay)
 */
#include "./ext/gui.h"
#define CIMGUI_DEFINE_ENUMS_AND_STRUCTS
#include "cimgui.h"

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

/* draw text in a small, see-through, borderless box in the top right corner */
static void GuiCornerText(const char *text) {
  ImGuiIO *io;
  ImVec2 pos, pivot;

  io = igGetIO();
  pos.x = io->DisplaySize.x - 10;
  pos.y = 10;
  pivot.x = 1; /* anchor the box's top right corner */
  pivot.y = 0;
  igSetNextWindowPos(pos, ImGuiCond_Always, pivot);
  igSetNextWindowBgAlpha(0.35f);
  igBegin("##corner_text", 0, ImGuiWindowFlags_NoDecoration
    | ImGuiWindowFlags_AlwaysAutoResize | ImGuiWindowFlags_NoSavedSettings
    | ImGuiWindowFlags_NoFocusOnAppearing | ImGuiWindowFlags_NoNav
    | ImGuiWindowFlags_NoInputs);
  igTextUnformatted(text, 0);
  igEnd();
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
    GuiCornerText(text);
}

/* the corner text, the only gui the game shows, in its own imgui frame */
void GuiDraw() {
  igNewFrame();
  GuiCornerOverlay();
  igRender();
}
