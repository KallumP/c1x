/*
 * the launcher: sets up settings.cfg, checks the game's files, and starts
 * the game, the level editor and the level builder (see doc/launcher.md)
 */
#include <SDL2/SDL.h>
#include <SDL2/SDL_opengl.h>
#define CIMGUI_DEFINE_ENUMS_AND_STRUCTS
#define CIMGUI_USE_SDL
#define CIMGUI_USE_OPENGL2
#include "cimgui.h"
#include "cimgui_impl.h"
#include "paths.h"
#include "game_section.h"
#include "settings_section.h"

#define WINDOW_WIDTH  720
#define WINDOW_HEIGHT 640

static SDL_Window *window;
static SDL_GLContext gl_context;
static char repo[PATH_MAX_LEN]; /* the repo folder, above the launcher's build folder */

static int OpenLauncherWindow() {
  if (SDL_Init(SDL_INIT_VIDEO) != 0) { return 0; }
  window = SDL_CreateWindow("c1x launcher",
    SDL_WINDOWPOS_CENTERED, SDL_WINDOWPOS_CENTERED,
    WINDOW_WIDTH, WINDOW_HEIGHT,
    SDL_WINDOW_OPENGL | SDL_WINDOW_SHOWN | SDL_WINDOW_RESIZABLE);
  if (!window) { return 0; }
  gl_context = SDL_GL_CreateContext(window);
  SDL_GL_SetSwapInterval(1);
  igCreateContext(0);
  igGetIO()->IniFilename = 0; /* don't write an imgui.ini */
  ImGui_ImplSDL2_InitForOpenGL(window, gl_context);
  ImGui_ImplOpenGL2_Init();
  return 1;
}

static void CloseLauncherWindow() {
  ImGui_ImplOpenGL2_Shutdown();
  ImGui_ImplSDL2_Shutdown();
  igDestroyContext(0);
  SDL_GL_DeleteContext(gl_context);
  SDL_DestroyWindow(window);
  SDL_Quit();
}

/* handle the window's events; returns 0 once it has been closed */
static int HandleEvents() {
  SDL_Event e;

  while (SDL_PollEvent(&e)) {
    ImGui_ImplSDL2_ProcessEvent(&e);
    if (e.type == SDL_QUIT) { return 0; }
  }
  return 1;
}

/* the launcher's one imgui window, filling the sdl window */
static void DrawLauncher() {
  ImGuiViewport *viewport;
  ImGuiWindowFlags flags;

  viewport = igGetMainViewport();
  igSetNextWindowPos(viewport->WorkPos, 0, (ImVec2){0,0});
  igSetNextWindowSize(viewport->WorkSize, 0);
  flags = ImGuiWindowFlags_NoDecoration | ImGuiWindowFlags_NoMove
    | ImGuiWindowFlags_NoSavedSettings;
  igBegin("launcher", 0, flags);
  DrawGameSection(repo);
  igSpacing();
  DrawSettingsSection(repo);
  igEnd();
}

static void DrawFrame() {
  ImGuiIO *io;

  ImGui_ImplOpenGL2_NewFrame();
  ImGui_ImplSDL2_NewFrame();
  igNewFrame();
  DrawLauncher();
  igRender();
  io = igGetIO();
  glViewport(0, 0, (int)io->DisplaySize.x, (int)io->DisplaySize.y);
  glClearColor(0.1f, 0.1f, 0.1f, 1.0f);
  glClear(GL_COLOR_BUFFER_BIT);
  ImGui_ImplOpenGL2_RenderDrawData(igGetDrawData());
  SDL_GL_SwapWindow(window);
}

int main(int argc, char *argv[]) {
  if (!FindRepoFolder(repo, sizeof(repo))) {
    SDL_strlcpy(repo, "..", sizeof(repo)); /* assume it's run from build/ */
  }
  LoadSettingsSection(repo);
  if (!OpenLauncherWindow()) {
    fprintf(stderr, "could not open the launcher's window: %s\n", SDL_GetError());
    return 1;
  }
  while (HandleEvents()) {
    DrawFrame();
  }
  CloseLauncherWindow();
  return 0;
}
