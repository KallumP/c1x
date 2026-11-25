/*
 * the launcher's controls section: each button's keys and controller buttons
 * from controls.cfg (see doc/controls.md), on a Keyboard, a Player 2 keys and a
 * Controller tab. click one and press another to change it
 */
#include <SDL2/SDL.h>
#define CIMGUI_DEFINE_ENUMS_AND_STRUCTS
#include "cimgui.h"
#include "controls_section.h"
#include "controls_file.h"
#include "pc/gamepad.h"
#include "paths.h"
#include "ui.h"

#define KEY_MIN_WIDTH 72.0f /* so one letter keys are still easy to click */
#define REMOVE_KEY_GAP 4.0f /* between a key and its x */
#define LABEL_WIDTH 120.0f
#define ROW_SPACING ((ImVec2){6, 4})
#define NOT_CAPTURING -1
#define SAME_GROUP NULL
#define UNTITLED_GROUP ""

/* what a tab binds buttons to */
typedef enum { KEYBOARD, P2_KEYBOARD, CONTROLLER } binding_kind;

/*
 * the buttons in the order they're shown, one to a row, grouped by what they do.
 * a row with a group starts a new group, under that heading if it has one
 */
static const struct {
  const char *group;
  const char *name;  /* in controls.cfg */
  const char *label;
} shown_buttons[PAD_BUTTON_COUNT] = {
  { "Movement", "up", "Up" }, { SAME_GROUP, "down", "Down" },
  { SAME_GROUP, "left", "Left" }, { SAME_GROUP, "right", "Right" },
  { UNTITLED_GROUP, "cross", "Jump (Cross)" }, { SAME_GROUP, "square", "Spin (Square)" },
  { SAME_GROUP, "triangle", "HUD (Triangle)" },
  { SAME_GROUP, "start", "Start" }, { SAME_GROUP, "select", "Select" },
  { "Other buttons", "circle", "Circle" },
  { SAME_GROUP, "l1", "L1" }, { SAME_GROUP, "r1", "R1" },
  { SAME_GROUP, "l2", "L2" }, { SAME_GROUP, "r2", "R2" },
  { SAME_GROUP, "l3", "L3" }, { SAME_GROUP, "r3", "R3" },
};

/* controller buttons by an xbox controller's names, which SDL's positions follow */
static const char *const controller_labels[GAMEPAD_CONTROL_COUNT] = {
  [SDL_CONTROLLER_BUTTON_A] = "A", [SDL_CONTROLLER_BUTTON_B] = "B",
  [SDL_CONTROLLER_BUTTON_X] = "X", [SDL_CONTROLLER_BUTTON_Y] = "Y",
  [SDL_CONTROLLER_BUTTON_BACK] = "Back", [SDL_CONTROLLER_BUTTON_GUIDE] = "Guide",
  [SDL_CONTROLLER_BUTTON_START] = "Start",
  [SDL_CONTROLLER_BUTTON_LEFTSTICK] = "Left stick", [SDL_CONTROLLER_BUTTON_RIGHTSTICK] = "Right stick",
  [SDL_CONTROLLER_BUTTON_LEFTSHOULDER] = "LB", [SDL_CONTROLLER_BUTTON_RIGHTSHOULDER] = "RB",
  [SDL_CONTROLLER_BUTTON_DPAD_UP] = "D-pad up", [SDL_CONTROLLER_BUTTON_DPAD_DOWN] = "D-pad down",
  [SDL_CONTROLLER_BUTTON_DPAD_LEFT] = "D-pad left", [SDL_CONTROLLER_BUTTON_DPAD_RIGHT] = "D-pad right",
  [GAMEPAD_LEFT_TRIGGER] = "LT", [GAMEPAD_RIGHT_TRIGGER] = "RT",
};

static launcher_controls controls;
static binding_kind shown_kind = KEYBOARD;      /* the tab being drawn */
static float binding_width;                     /* every binding on the tab, so they line up */
static int capturing_button = NOT_CAPTURING;    /* waiting for a press for this button */
static int capturing_index;                     /* the binding it replaces, or the count to add one */
static binding_kind capturing_kind;             /* a key press or a controller press */
static char status[PATH_MAX_LEN + 64];          /* what Save last did */
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

/* write the keys and controller buttons to controls.cfg; returns 0 (saying why) if it can't */
int SaveControlsSection(const char *repo) {
  char path[PATH_MAX_LEN], example_path[PATH_MAX_LEN], text[PATH_MAX_LEN + 64];
  int saved;

  ControlsPath(repo, path, sizeof(path));
  JoinPath(example_path, sizeof(example_path), repo, "controls.example.cfg");
  saved = SaveControlsFile(path, example_path, &controls);
  if (saved) { SDL_snprintf(text, sizeof(text), "Saved %s.", path); }
  else { SDL_snprintf(text, sizeof(text), "Couldn't save %s.", path); }
  SetStatus(!saved, text);
  return saved;
}

/* a button's binding count for a kind: how many keys, or controller buttons */
static int *BindingCount(binding_kind kind, int button) {
  if (kind == CONTROLLER) { return &controls.pad_count[button]; }
  if (kind == P2_KEYBOARD) { return &controls.p2_key_count[button]; }
  return &controls.key_count[button];
}

/* player two's keys are optional (he can play on a controller); player one's buttons keep one */
static int MinBindings(binding_kind kind) {
  if (kind == P2_KEYBOARD) { return 0; }
  return 1;
}

static int MaxBindings(binding_kind kind) {
  if (kind == CONTROLLER) { return BUTTON_PADS_MAX; }
  return BUTTON_KEYS_MAX;
}

static int BindingAt(binding_kind kind, int button, int index) {
  if (kind == CONTROLLER) { return controls.pads[button][index]; }
  if (kind == P2_KEYBOARD) { return controls.p2_keys[button][index]; }
  return controls.keys[button][index];
}

static void SetBindingAt(binding_kind kind, int button, int index, int binding) {
  if (kind == CONTROLLER) { controls.pads[button][index] = binding; }
  else if (kind == P2_KEYBOARD)
    controls.p2_keys[button][index] = (SDL_Scancode)binding;
  else { controls.keys[button][index] = (SDL_Scancode)binding; }
}

static const char *ControllerLabel(int control) {
  if (control >= 0 && control < GAMEPAD_CONTROL_COUNT && controller_labels[control]) {
    return controller_labels[control];
  }
  return GamepadControlName(control); /* SDL's own name for the rarer ones */
}

static const char *BindingLabel(binding_kind kind, int binding) {
  if (kind == CONTROLLER) { return ControllerLabel(binding); }
  return SDL_GetScancodeName(binding);
}

static void StopCapture(void) {
  capturing_button = NOT_CAPTURING;
}

/* give the press to the button waiting for one */
static void FinishCapture(int binding) {
  int *count = BindingCount(capturing_kind, capturing_button);

  SetBindingAt(capturing_kind, capturing_button, capturing_index, binding);
  if (capturing_index == *count) { (*count)++; }
  StopCapture();
  status[0] = 0;
}

/* give a pressed key to the button waiting for one; returns 1 if the key was used up */
int TakeControlsKeyPress(SDL_Scancode code) {
  if (capturing_button == NOT_CAPTURING) { return 0; }
  if (code == SDL_SCANCODE_ESCAPE) { StopCapture(); } /* cancelled */
  else if (capturing_kind != CONTROLLER) { FinishCapture(code); }
  return 1; /* a key while waiting for a controller button does nothing */
}

/* give a pressed controller control to the button waiting for one; returns 1 if one was */
int TakeControlsPadPress(int control) {
  if (capturing_button == NOT_CAPTURING || capturing_kind != CONTROLLER) { return 0; }
  FinishCapture(control);
  return 1;
}

static void StartCapture(int button, int index) {
  capturing_button = button;
  capturing_index = index;
  capturing_kind = shown_kind;
}

static void RemoveBinding(int button, int index) {
  int *count = BindingCount(shown_kind, button);
  int i;

  for (i = index; i < *count - 1; i++) {
    SetBindingAt(shown_kind, button, i, BindingAt(shown_kind, button, i + 1));
  }
  (*count)--;
}

static int IsCapturing(int button, int index) {
  return capturing_button == button && capturing_index == index && capturing_kind == shown_kind;
}

static const char *PressPrompt(void) {
  if (shown_kind == CONTROLLER) { return "Press a button"; }
  return "Press a key";
}

/* the widest of the tab's bindings and its press prompt, and at least KEY_MIN_WIDTH */
static float WidestBindingWidth(void) {
  float widest;
  int button, index;

  widest = SDL_max(KEY_MIN_WIDTH, ButtonWidth(PressPrompt()));
  for (button = 0; button < PAD_BUTTON_COUNT; button++) {
    for (index = 0; index < *BindingCount(shown_kind, button); index++) {
      widest = SDL_max(widest, ButtonWidth(BindingLabel(shown_kind, BindingAt(shown_kind, button, index))));
    }
  }
  return widest;
}

/* a binding's button, as wide as every other on the tab */
static int DrawBindingButton(const char *name) {
  return igButton(name, (ImVec2){binding_width, 0});
}

/* the remove button beside a binding, or a gap as wide when it's its button's only one,
   so every binding takes the same room and they and + line up down the column */
static void DrawRemoveBinding(int button, int index) {
  ImVec2 text_size;

  igSameLine(0, REMOVE_KEY_GAP);
  if (*BindingCount(shown_kind, button) <= MinBindings(shown_kind)) {
    igCalcTextSize(&text_size, "x", 0, false, -1);
    igDummy((ImVec2){text_size.x + 2 * igGetStyle()->FramePadding.x, igGetFrameHeight()});
    return;
  }
  if (igButton("x", (ImVec2){0, 0})) { RemoveBinding(button, index); }
  if (shown_kind == CONTROLLER) { DrawTooltip("Remove this controller button"); }
  else { DrawTooltip("Remove this key"); }
}

static void DrawBinding(int button, int index) {
  const char *name;

  if (IsCapturing(button, index)) { name = PressPrompt(); }
  else { name = BindingLabel(shown_kind, BindingAt(shown_kind, button, index)); }
  igPushID_Int(index);
  if (DrawBindingButton(name)) { StartCapture(button, index); }
  DrawRemoveBinding(button, index);
  igPopID();
  igSameLine(0, 12); /* a gap between one binding and the next */
}

static void DrawAddBinding(int button) {
  int count = *BindingCount(shown_kind, button);

  if (IsCapturing(button, count)) {
    DrawBindingButton(PressPrompt());
    return;
  }
  if (count == MaxBindings(shown_kind)) { return; }
  if (igButton("+", (ImVec2){0, 0})) { StartCapture(button, count); }
  if (shown_kind == CONTROLLER) { DrawTooltip("Add another controller button for this button"); }
  else { DrawTooltip("Add another key for this button"); }
}

/* a gap before each group but the first, and its heading if it has one */
static void DrawGroupStart(int shown) {
  const char *group = shown_buttons[shown].group;

  if (group == SAME_GROUP) { return; }
  igTableNextRow(0, 0);
  igTableNextColumn();
  if (shown > 0) { igSpacing(); }
  if (group[0] != 0) { igTextDisabled("%s", group); }
}

static void DrawButtonBindings(int shown) {
  int button, index;

  DrawGroupStart(shown);
  button = FindPadButton(shown_buttons[shown].name);
  igTableNextRow(0, 0);
  igTableNextColumn();
  igAlignTextToFramePadding();
  igText("%s", shown_buttons[shown].label);
  igTableNextColumn();
  igPushID_Int(button);
  for (index = 0; index < *BindingCount(shown_kind, button); index++) { DrawBinding(button, index); }
  DrawAddBinding(button);
  igPopID();
}

static void DrawBindingTable(void) {
  int shown;

  igPushStyleVar_Vec2(ImGuiStyleVar_ItemSpacing, ROW_SPACING); /* 16 rows, kept close */
  if (igBeginTable("controls_bindings", 2, ImGuiTableFlags_SizingFixedFit, (ImVec2){0, 0}, 0)) {
    igTableSetupColumn("label", ImGuiTableColumnFlags_WidthFixed, LABEL_WIDTH, 0);
    igTableSetupColumn("bindings", ImGuiTableColumnFlags_WidthStretch, 0, 0);
    for (shown = 0; shown < PAD_BUTTON_COUNT; shown++) { DrawButtonBindings(shown); }
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
  DrawTooltip("Every button back to its default key and controller button (Save to keep it).");
  if (!status[0]) { return; }
  if (status_is_problem) { igTextColored(PROBLEM_COLOUR, "%s", status); }
  else { igText("%s", status); }
}

static void DrawKeyboardHelp(void) {
  igTextWrapped("Click a key, then press the key you want instead (Esc to cancel). "
    "A button can have several keys.");
}

static void DrawPlayerTwoKeyboardHelp(void) {
  igTextWrapped("Player two's keys, for two players on one keyboard "
    "(the two_players setting). "
    "Click a key, then press the key you want instead (Esc to cancel). "
    "Player two can play on a second controller instead.");
}

static void DrawControllerHelp(void) {
  igTextWrapped("Click a controller button, then press the one you want instead (Esc to cancel). "
    "Buttons are named as on an Xbox controller: A is the bottom face button. "
    "The left stick always moves like the d-pad. "
    "Both players' controllers use these buttons: the first plugged in is player one's.");
  if (SDL_NumJoysticks() == 0) { igTextDisabled("No controller found: plug one in to set its buttons."); }
}

/* a tab of the section: its help, then each button's bindings of that kind */
static void DrawBindingTab(const char *name, binding_kind kind, void (*draw_help)(void)) {
  if (!igBeginTabItem(name, 0, 0)) { return; }
  shown_kind = kind;
  binding_width = WidestBindingWidth();
  if (capturing_button != NOT_CAPTURING && capturing_kind != kind) { StopCapture(); } /* left its tab */
  igSpacing();
  draw_help();
  igSpacing();
  DrawBindingTable();
  igEndTabItem();
}

void DrawControlsSection(const char *repo) {
  if (igBeginTabBar("controls_kind", 0)) {
    DrawBindingTab("Keyboard", KEYBOARD, DrawKeyboardHelp);
    DrawBindingTab("Player 2 keys", P2_KEYBOARD, DrawPlayerTwoKeyboardHelp);
    DrawBindingTab("Controller", CONTROLLER, DrawControllerHelp);
    igEndTabBar();
  }
  igSpacing();
  DrawButtons(repo);
}
