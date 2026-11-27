#include <SDL2/SDL.h>
#include <unistd.h>
#ifdef CFLAGS_GUI
#define CIMGUI_DEFINE_ENUMS_AND_STRUCTS
#define CIMGUI_USE_SDL
#include "cimgui.h"
#include "cimgui_impl.h"
#endif

#include "ns.h"
#include "pc/audiosong.h"
#include "math.h"
#include "pad.h"
#include "pc/gamepad.h"
#include "pc/gfx/gl.h"
#include "pc/time.h"
#include "pc/settings.h"
#include "pc/replay.h"
#include "pc/card.h"
#include "pc/card_game.h"
#include "pc/fps.h"
#include "pc/fullscreen.h"

#define WINDOW_WIDTH  1024
#define WINDOW_HEIGHT 768

SDL_Window *window = 0;
SDL_GLContext ogl_context;
uint8_t keys[SDL_NUM_SCANCODES] = { 0 }; /* indexed by SDL scancode */
int32_t mousex, mousey;
int mousel;

extern ns_struct ns;
extern int done;
extern eid_t insts[8];
extern page_struct texture_pages[NS_TEXTURE_PAGE_COUNT];
extern uint32_t seed_a;

/* the window's flags: filling the screen at its own resolution if fullscreen is on */
static Uint32 WindowFlags() {
  Uint32 flags = SDL_WINDOW_OPENGL | SDL_WINDOW_SHOWN;

  if (game_settings.fullscreen) { flags |= SDL_WINDOW_FULLSCREEN_DESKTOP; }
  return flags;
}

void SDLInit() {
  SDL_Init(SDL_INIT_VIDEO | SDL_INIT_AUDIO | SDL_INIT_GAMECONTROLLER);
  SDL_GL_SetAttribute(SDL_GL_DEPTH_SIZE, 24); /* for fix_model_draw_order */
  window = SDL_CreateWindow("c1x",
    SDL_WINDOWPOS_UNDEFINED,
    SDL_WINDOWPOS_UNDEFINED,
    WINDOW_WIDTH, WINDOW_HEIGHT,
    WindowFlags());
  SDL_ShowCursor(SDL_DISABLE); /* the game is played with keys or a pad; only hidden over its window */
  ogl_context = SDL_GL_CreateContext(window);
  /* frames are drawn between game frames on their own timing (see pc/tween.h), so
     a swap mustn't wait for the screen: that would push the game frame past its time */
  if (game_settings.frame_rate > SETTINGS_FRAME_RATE_MIN)
    SDL_GL_SetSwapInterval(0);
#ifdef CFLAGS_GUI
  igCreateContext(0);
  igGetIO()->ConfigFlags |= ImGuiConfigFlags_NoMouseCursorChange; /* else it shows the cursor every frame */
  ImGui_ImplSDL2_InitForOpenGL(window, ogl_context);
#endif
}

void SDLKill() {
#ifdef CFLAGS_GUI
  ImGui_ImplSDL2_Shutdown();
#endif
  SDL_GL_DeleteContext(ogl_context);
  SDL_DestroyWindow(window);
  SDL_Quit();
}

/* switch between filling the screen and the window it started in */
static void ToggleFullscreen() {
  Uint32 flags = SDL_GetWindowFlags(window);

  if (flags & SDL_WINDOW_FULLSCREEN) {
    SDL_SetWindowFullscreen(window, 0);
  } else {
    SDL_SetWindowFullscreen(window, SDL_WINDOW_FULLSCREEN_DESKTOP);
  }
}

/* connect a controller that was plugged in (also sent for ones there at startup) */
static void ConnectController(int device_index) {
  SDL_GameController *controller;

  if (!SDL_IsGameController(device_index)) { return; }
  controller = SDL_GameControllerOpen(device_index);
  if (!controller) { return; }
  GamepadConnect(SDL_JoystickInstanceID(SDL_GameControllerGetJoystick(controller)));
}

/* let go of a controller that was unplugged */
static void DisconnectController(SDL_JoystickID instance_id) {
  SDL_GameController *controller;

  controller = SDL_GameControllerFromInstanceID(instance_id);
  if (controller) { SDL_GameControllerClose(controller); }
  GamepadDisconnect(instance_id);
}

/* a key going down; a fullscreen toggle (alt+enter, f11) isn't the game's, so enter doesn't press start */
static void PressKey(SDL_KeyboardEvent *key) {
  if (IsFullscreenToggle(key->keysym.scancode, key->keysym.mod)) {
    if (!key->repeat) { ToggleFullscreen(); }
    return;
  }
  keys[key->keysym.scancode] = 1;
}

void SDLUpdate() {
  SDL_Event e;
  while (SDL_PollEvent(&e)) {
#ifdef CFLAGS_GUI
    ImGui_ImplSDL2_ProcessEvent(&e);
#endif
    switch (e.type) {
    case SDL_QUIT:
      done = 1;
      break;
    case SDL_KEYDOWN:
      PressKey(&e.key);
      break;
    case SDL_KEYUP:
      keys[e.key.keysym.scancode] = 0;
      break;
    case SDL_CONTROLLERDEVICEADDED:
      ConnectController(e.cdevice.which);
      break;
    case SDL_CONTROLLERDEVICEREMOVED:
      DisconnectController(e.cdevice.which);
      break;
    case SDL_CONTROLLERBUTTONDOWN:
    case SDL_CONTROLLERBUTTONUP:
      GamepadSetButton(GamepadFind(e.cbutton.which), e.cbutton.button,
        e.type == SDL_CONTROLLERBUTTONDOWN);
      break;
    case SDL_CONTROLLERAXISMOTION:
      GamepadSetAxis(GamepadFind(e.caxis.which), e.caxis.axis, e.caxis.value);
      break;
    case SDL_MOUSEBUTTONUP:
    case SDL_MOUSEBUTTONDOWN:
      mousel = e.type == SDL_MOUSEBUTTONDOWN;
    case SDL_MOUSEMOTION:
      mousex = e.motion.x;
      mousey = e.motion.y;
      break;
    default:
      break;
    }
  }
#ifdef CFLAGS_GUI
  ImGui_ImplSDL2_NewFrame();
#endif
}

void SDLSwap() {
  SDL_GL_SwapWindow(window);
  FpsCountShownFrame(SDL_GetTicks());
}

void SDLDrawableSize(int *w, int *h) {
  SDL_GL_GetDrawableSize(window, w, h);
}

void SDLInput(gl_input *input) {
  int i, w, h;

  SDL_GetWindowSize(window, &w, &h);
  input->window.w = w;
  input->window.h = h;
  input->mouse.x = mousex;
  input->mouse.y = mousey;
  input->click = 0 | (mousel ? 1 : 0);
  for (i=0;i<512;i++) {
    input->keys[i] = keys[i];
  }
}

/*
 * change to the directory containing streams/, so the game also works
 * when the executable is launched from elsewhere (e.g. build/c1x.exe).
 * checks the working directory, the executable's directory, then its parent.
 */
static void FindDataDir() {
  char *base, path[1024];

  if (access("streams", 0) == 0) { return; }
  base = SDL_GetBasePath();
  if (!base) { return; }
  snprintf(path, sizeof(path), "%sstreams", base);
  if (access(path, 0) == 0) {
    chdir(base);
  }
  else {
    snprintf(path, sizeof(path), "%s../streams", base);
    if (access(path, 0) == 0) {
      snprintf(path, sizeof(path), "%s..", base);
      chdir(path);
    }
  }
  SDL_free(base);
}

lid_t boot_lid = LID_BOOTLEVEL; /* level the game starts in: the title screen */

/*
 * make levels/<boot_level> next to the executable the custom level (the
 * test level), if boot_level is set and the level's files are there. the
 * game still starts at the title screen: its main menu's CUSTOM LEVEL
 * starts the level (see pc/custommenu.h)
 */
static void InitCustomLevel() {
  char level[900], path[1024], *base;

  if (!game_settings.boot_level[0]) { return; }
  base = SDL_GetBasePath();
  snprintf(level, sizeof(level), "%s%s/%s", base ? base : "", LEVELS_DIR,
    game_settings.boot_level);
  SDL_free(base);
  snprintf(path, sizeof(path), "%s.nsd", level);
  if (access(path, 0) != 0) {
    fprintf(stderr, "no level %s, starting normally\n", path);
    return;
  }
  NSSetCustomLevel(level);
  AudioSongFind(level, &custom_level_audio_song);
}

/* a recording keeps a copy of the memory card's saves and the settings as they were when it started */
static void KeepWithRecording(const char *recording_path) {
  char dir[1024], settings_path[1024];

  ReplayCardDir(dir, sizeof(dir), recording_path);
  CardCopyFiles(CARD_GAME_DIR, dir);
  ReplaySettingsFile(settings_path, sizeof(settings_path), recording_path);
  if (!SettingsCopyFile("settings.cfg", settings_path))
    fprintf(stderr, "could not keep the settings with %s\n", recording_path);
}

/*
 * a replay plays on a copy of the saves its recording started with, so it
 * plays out the same and leaves the player's saves alone
 */
static void UseRecordingsCard(const char *recording_path) {
  char dir[1024];

  ReplayCardDir(dir, sizeof(dir), recording_path);
  CardCopyFiles(dir, CARD_GAME_REPLAY_DIR);
  CardGameUseFolder(CARD_GAME_REPLAY_DIR);
}

static void RecordingsDir(char *dir, size_t size) {
  char *base;

  base = SDL_GetBasePath();
  snprintf(dir, size, "%s%s", base ? base : "", REPLAY_DIR);
  SDL_free(base);
}

static char replay_path[1024] = ""; /* the recording to replay, or "" */

/*
 * with replay_inputs on, pick the newest recording to replay and play with
 * the settings it started with. before anything reads the settings, as they
 * can change the boot level
 */
static void FindReplay() {
  char dir[1024], settings_path[1024];

  if (!game_settings.replay_inputs) { return; }
  RecordingsDir(dir, sizeof(dir));
  if (!ReplayNewestFile(dir, replay_path, sizeof(replay_path))) {
    fprintf(stderr, "no recordings in %s to replay\n", dir);
    return;
  }
  ReplaySettingsFile(settings_path, sizeof(settings_path), replay_path);
  if (!SettingsLoadRecorded(settings_path))
    fprintf(stderr, "no settings kept with %s, replaying with your own\n", replay_path);
}

/*
 * replay the recording FindReplay picked, or if replay_inputs is off, record
 * this run to a new file in recorded_inputs (next to the executable), named
 * by its start time
 */
static void InitReplay() {
  char dir[1024], path[1024];
  time_t now;

  if (game_settings.replay_inputs) {
    if (!replay_path[0]) { return; }
    if (ReplayStart(replay_path, REPLAY_PLAY, boot_lid, seed_a)) {
      fprintf(stderr, "replaying %s\n", replay_path);
      TimeSetSpeed(game_settings.replay_speed);
      UseRecordingsCard(replay_path);
    }
    else
      fprintf(stderr, "could not replay %s\n", replay_path);
    return;
  }
  RecordingsDir(dir, sizeof(dir));
  if (!ReplayMakeDir(dir)) {
    fprintf(stderr, "could not make %s to record inputs\n", dir);
    return;
  }
  now = time(0);
  ReplayFileName(path, sizeof(path), dir, localtime(&now));
  if (!ReplayStart(path, REPLAY_RECORD, boot_lid, seed_a)) {
    fprintf(stderr, "could not open %s to record inputs\n", path);
    return;
  }
  KeepWithRecording(path);
}

int init() {
  gl_callbacks callbacks;
  int i;

  FindDataDir();
  PadInit(2); /* initialize 2 joypad structs */
  PadLoadBindings("controls.cfg"); /* keeps the default bindings if missing */
  SettingsReset(&game_settings);
  SettingsLoad("settings.cfg"); /* keeps the default settings if missing */
  FindReplay();
  SetTicksElapsed(0);
  SDLInit();
  callbacks.pre_update = SDLUpdate;
  callbacks.post_update = SDLSwap;
  callbacks.ext_supported = (int (*)(const char*))SDL_GL_ExtensionSupported;
  callbacks.proc_addr = SDL_GL_GetProcAddress;
  callbacks.input = SDLInput;
  callbacks.drawable_size = SDLDrawableSize;
  GLInit(&callbacks);
  sranda2();
  InitCustomLevel();
  InitReplay();
  for (i=1;i<4;i++)
    insts[i] = EID_NONE;
  for (i=0;i<NS_TEXTURE_PAGE_COUNT;i++)
    texture_pages[i].eid = EID_NONE;
  ns.draw_skip_counter = 0;
  return SUCCESS;
}

int _kill() {
  ReplayStop();
  GLKill();
  SDLKill();
  return 0;
}
