/*
 * the launcher's Help tab: a button for each page of c1x's guide (help.h),
 * which opens it in the browser
 */
#include <SDL2/SDL.h>
#define CIMGUI_DEFINE_ENUMS_AND_STRUCTS
#include "cimgui.h"
#include "help.h"
#include "help_section.h"
#include "paths.h"
#include "ui.h"

#define HELP_BUTTON_WIDTH 140

static void OpenHelpPage(const char *repo, const help_page *page) {
  char url[FILE_URL_MAX];

  HelpPageAddress(repo, page, url, sizeof(url));
  SDL_OpenURL(url);
}

static void DrawHelpPageRow(const char *repo, const help_page *page) {
  if (igButton(page->name, (ImVec2){HELP_BUTTON_WIDTH, 0})) { OpenHelpPage(repo, page); }
  igSameLine(0, -1);
  igAlignTextToFramePadding();
  igTextWrapped("%s", page->about);
}

void DrawHelpSection(const char *repo) {
  int i;

  igTextWrapped("c1x's guide opens in your web browser.");
  igSpacing();
  for (i = 0; i < HELP_PAGE_COUNT; i++) { DrawHelpPageRow(repo, &help_pages[i]); }
}
