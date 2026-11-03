/*
 * the launcher's look (fonts and style), and parts of its window that
 * several sections draw
 */
#include <SDL2/SDL.h>
#define CIMGUI_DEFINE_ENUMS_AND_STRUCTS
#include "cimgui.h"
#include "ui.h"

#ifdef _WIN32
#define BODY_FONT    "C:/Windows/Fonts/segoeui.ttf"
#define HEADING_FONT "C:/Windows/Fonts/segoeuib.ttf"
#else
#define BODY_FONT    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
#define HEADING_FONT "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
#endif
#define BODY_FONT_SIZE    18.0f
#define HEADING_FONT_SIZE 22.0f
#define LABEL_WIDTH 260.0f
#define OUTPUT_HEIGHT 160
#define BIG_BUTTON_SIZE ((ImVec2){240, 48})

static ImFont *heading_font; /* 0 to use the body font */

static int IsFileThere(const char *path) {
  SDL_RWops *file;

  file = SDL_RWFromFile(path, "rb");
  if (!file) { return 0; }
  SDL_RWclose(file);
  return 1;
}

static ImFont *AddFontIfThere(const char *path, float size) {
  if (!IsFileThere(path)) { return 0; }
  return ImFontAtlas_AddFontFromFileTTF(igGetIO()->Fonts, path, size, 0, 0);
}

/* the system's font, or imgui's own if it's missing; call before the first frame */
void LoadLauncherFonts(void) {
  if (!AddFontIfThere(BODY_FONT, BODY_FONT_SIZE)) { return; } /* the first font is the body's */
  heading_font = AddFontIfThere(HEADING_FONT, HEADING_FONT_SIZE);
}

void SetLauncherStyle(void) {
  ImGuiStyle *style;

  style = igGetStyle();
  igStyleColorsDark(style);
  style->WindowPadding = (ImVec2){18, 16};
  style->WindowBorderSize = 0; /* it fills the sdl window */
  style->FramePadding = (ImVec2){10, 5};
  style->ItemSpacing = (ImVec2){10, 8};
  style->ItemInnerSpacing = (ImVec2){8, 6};
  style->FrameRounding = 4;
  style->GrabRounding = 4;
  style->TabRounding = 4;
  style->ChildRounding = 4;
  style->PopupRounding = 4;
}

/* a section's title, with a line under it */
void DrawHeading(const char *text) {
  if (heading_font) { igPushFont(heading_font); }
  igText("%s", text);
  if (heading_font) { igPopFont(); }
  igSeparator();
}

/* a button for the main thing to do, in the heading font */
int DrawBigButton(const char *label) {
  int pressed;

  if (heading_font) { igPushFont(heading_font); }
  pressed = igButton(label, BIG_BUTTON_SIZE);
  if (heading_font) { igPopFont(); }
  return pressed;
}

void DrawTooltip(const char *text) {
  if (igIsItemHovered(0)) { igSetTooltip("%s", text); }
}

/* rows of a label, then its field; returns 0 if there's nothing to draw */
int BeginFieldRows(const char *id) {
  if (!igBeginTable(id, 2, ImGuiTableFlags_SizingFixedFit, (ImVec2){0, 0}, 0)) { return 0; }
  igTableSetupColumn("label", ImGuiTableColumnFlags_WidthFixed, LABEL_WIDTH, 0);
  igTableSetupColumn("field", ImGuiTableColumnFlags_WidthStretch, 0, 0);
  return 1;
}

/* a row's label (hover it for tooltip); the field drawn next goes beside it */
void BeginFieldRow(const char *label, const char *tooltip) {
  igTableNextRow(0, 0);
  igTableNextColumn();
  igAlignTextToFramePadding();
  igText("%s", label);
  DrawTooltip(tooltip);
  igTableNextColumn();
}

void EndFieldRows(void) {
  igEndTable();
}

/* a box of c's output, if it has any, kept scrolled to the end while it runs */
void DrawCommandOutput(const char *id, const background_command *c) {
  if (!c->output[0]) { return; }
  igBeginChild_Str(id, (ImVec2){0, OUTPUT_HEIGHT}, true, 0);
  igTextUnformatted(c->output, 0);
  if (IsBackgroundCommandRunning(c)) { igSetScrollHereY(1.0f); }
  igEndChild();
}
