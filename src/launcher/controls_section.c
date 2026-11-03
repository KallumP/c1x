/*
 * the launcher's controls section: each button's keys from controls.cfg
 * (see doc/controls.md). click a key and press another to change it
 */
#include <SDL2/SDL.h>
#define CIMGUI_DEFINE_ENUMS_AND_STRUCTS
#include "cimgui.h"
#include "controls_section.h"
#include "controls_file.h"
#include "paths.h"
#include "ui.h"

#define KEY_MIN_WIDTH 72.0f /* so one letter keys are still easy to click */
#define LABEL_WIDTH 100.0f
#define ROW_SPACING ((ImVec2){6, 4})
#define NOT_CAPTURING -1

/* the buttons in the order they're shown, one to a row */
static const struct {
  const char *name;  /* in controls.cfg */
  const char *label;
} shown_buttons[PAD_BUTTON_COUNT] = {
  { "cross", "Cross" }, { "square", "Square" },
  { "circle", "Circle" }, { "triangle", "Triangle" },
  { "l1", "L1" }, { "r1", "R1" },
  { "l2", "L2" }, { "r2", "R2" },
  { "l3", "L3" }, { "r3", "R3" },
  { "up", "Up" }, { "down", "Down" },
  { "left", "Left" }, { "right", "Right" },
  { "start", "Start" }, { "select", "Select" },
};

static launcher_controls controls;
static int capturing_button = NOT_CAPTURING; /* waiting for a key press for this button */
static int capturing_key;                    /* the key it replaces, or key_count to add one */
static char status[PATH_MAX_LEN + 64];       /* what Save last did, or why a key was refused */
static int status_is_problem;

static void ControlsPath(const char *repo, char *path, size_t size) {
  JoinPath(path, size, repo, "controls.cfg");
}

static void SetStatus(int is_problem, const char *text) {
  SDL_strlcpy(status, text, sizeof(status));
  status_is_problem = is_problem;
}

/* read controls.cfg, creating it from controls.example.cfg if there isn't one */
void LoadControlsSection(const char *repo) {
  char path[PATH_MAX_LEN];

  ControlsPath(repo, path, sizeof(path));
  if (!ReadControlsFile(path, &controls)) { SaveControlsSection(repo); } /* the defaults */
  capturing_button = NOT_CAPTURING;
  status[0] = 0;
}

/* write the keys to controls.cfg; returns 0 (saying why) if it can't */
int SaveControlsSection(const char *repo) {
  char path[PATH_MAX_LEN], example_path[PATH_MAX_LEN], text[PATH_MAX_LEN + 64];
  int saved;

  ControlsPath(repo, path, sizeof(path));
  JoinPath(example_path, sizeof(example_path), repo, "controls.example.cfg");
  saved = SaveControlsFile(path, example_path, &controls);
  SDL_snprintf(text, sizeof(text), saved ? "Saved %s." : "Couldn't save %s.", path);
  SetStatus(!saved, text);
  return saved;
}

/* give a pressed key to the button waiting for one; returns 1 if one was */
int TakeControlsKeyPress(SDL_Scancode code) {
  int button = capturing_button;

  if (button == NOT_CAPTURING) { return 0; }
  capturing_button = NOT_CAPTURING;
  if (code == SDL_SCANCODE_ESCAPE) { return 1; } /* cancelled */
  if (code == SDL_SCANCODE_TAB) {
    SetStatus(1, "Tab can't be used: the game's debug GUI uses it.");
    return 1;
  }
  controls.keys[button][capturing_key] = code;
  if (capturing_key == controls.key_count[button]) { controls.key_count[button]++; }
  status[0] = 0;
  return 1;
}

static void StartCapture(int button, int key) {
  capturing_button = button;
  capturing_key = key;
}

static void RemoveKey(int button, int key) {
  int i;

  for (i = key; i < controls.key_count[button] - 1; i++) {
    controls.keys[button][i] = controls.keys[button][i + 1];
  }
  controls.key_count[button]--;
}

static int IsCapturing(int button, int key) {
  return capturing_button == button && capturing_key == key;
}

/* a button wide enough for name, and at least KEY_MIN_WIDTH */
static int DrawKeyButton(const char *name) {
  ImVec2 text_size;

  igCalcTextSize(&text_size, name, 0, false, -1);
  return igButton(name, (ImVec2){SDL_max(text_size.x + 2 * igGetStyle()->FramePadding.x, KEY_MIN_WIDTH), 0});
}

static void DrawKey(int button, int key) {
  const char *name;

  name = IsCapturing(button, key) ? "Press a key" : SDL_GetScancodeName(controls.keys[button][key]);
  igPushID_Int(key);
  if (DrawKeyButton(name)) { StartCapture(button, key); }
  if (controls.key_count[button] > 1) {
    igSameLine(0, 1);
    if (igButton("x", (ImVec2){0, 0})) { RemoveKey(button, key); }
    DrawTooltip("Remove this key");
  }
  igPopID();
  igSameLine(0, 12); /* a gap between one key and the next */
}

static void DrawAddKey(int button) {
  int count = controls.key_count[button];

  if (IsCapturing(button, count)) {
    DrawKeyButton("Press a key");
    return;
  }
  if (count == BUTTON_KEYS_MAX) { return; }
  if (igButton("+", (ImVec2){0, 0})) { StartCapture(button, count); }
  DrawTooltip("Add another key for this button");
}

static void DrawButtonKeys(int shown) {
  int button, key;

  button = FindPadButton(shown_buttons[shown].name);
  igTableNextRow(0, 0);
  igTableNextColumn();
  igAlignTextToFramePadding();
  igText("%s", shown_buttons[shown].label);
  igTableNextColumn();
  igPushID_Int(button);
  for (key = 0; key < controls.key_count[button]; key++) { DrawKey(button, key); }
  DrawAddKey(button);
  igPopID();
}

static void DrawKeyTable(void) {
  int shown;

  igPushStyleVar_Vec2(ImGuiStyleVar_ItemSpacing, ROW_SPACING); /* 16 rows, kept close */
  if (igBeginTable("controls_keys", 2, ImGuiTableFlags_SizingFixedFit, (ImVec2){0, 0}, 0)) {
    igTableSetupColumn("label", ImGuiTableColumnFlags_WidthFixed, LABEL_WIDTH, 0);
    igTableSetupColumn("keys", ImGuiTableColumnFlags_WidthStretch, 0, 0);
    for (shown = 0; shown < PAD_BUTTON_COUNT; shown++) { DrawButtonKeys(shown); }
    igEndTable();
  }
  igPopStyleVar(1);
}

static void DrawButtons(const char *repo) {
  if (igButton("Save", (ImVec2){BUTTON_WIDTH, 0})) { SaveControlsSection(repo); }
  igSameLine(0, -1);
  if (igButton("Reload", (ImVec2){BUTTON_WIDTH, 0})) { LoadControlsSection(repo); }
  DrawTooltip("Read controls.cfg again, dropping changes you haven't saved.");
  igSameLine(0, -1);
  if (igButton("Reset to defaults", (ImVec2){0, 0})) { ResetControls(&controls); }
  DrawTooltip("Every button back to its default key (Save to keep it).");
  if (!status[0]) { return; }
  if (status_is_problem) { igTextColored(PROBLEM_COLOUR, "%s", status); }
  else { igText("%s", status); }
}

void DrawControlsSection(const char *repo) {
  igTextWrapped("Click a key, then press the key you want instead (Esc to cancel). "
    "A button can have several keys.");
  igSpacing();
  DrawKeyTable();
  igSpacing();
  DrawButtons(repo);
}
