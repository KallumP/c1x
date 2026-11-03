/*
 * parts of the launcher's window that several sections draw
 */
#define CIMGUI_DEFINE_ENUMS_AND_STRUCTS
#include "cimgui.h"
#include "ui.h"

#define OUTPUT_HEIGHT 160

/* a box of c's output, if it has any, kept scrolled to the end while it runs */
void DrawCommandOutput(const char *id, const background_command *c) {
  if (!c->output[0]) { return; }
  igBeginChild_Str(id, (ImVec2){0, OUTPUT_HEIGHT}, true, 0);
  igTextUnformatted(c->output, 0);
  if (IsBackgroundCommandRunning(c)) { igSetScrollHereY(1.0f); }
  igEndChild();
}
