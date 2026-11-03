/*
 * extracting the game's files from a disc image, from the launcher's game
 * section: a disc image field, Browse, and Extract showing the output
 */
#include <SDL2/SDL.h>
#define CIMGUI_DEFINE_ENUMS_AND_STRUCTS
#include "cimgui.h"
#include "extract_section.h"
#include "extract.h"
#include "file_dialog.h"
#include "paths.h"
#include "command.h"
#include "ui.h"

static char image[PATH_MAX_LEN];
static background_command extraction;
static char problem[PATH_MAX_LEN + 64]; /* why the last extraction failed, or "" */

static void StartExtraction(const char *repo) {
  char command[PATH_MAX_LEN + 64];
  char folder[PATH_MAX_LEN];

  problem[0] = 0;
  if (!ExtractStreamsCommand(repo, image, command, sizeof(command))) {
    SDL_strlcpy(problem, image[0] ? "That disc image's path has a quote in it."
      : "Choose a disc image first.", sizeof(problem));
    return;
  }
  ExtractStreamsFolder(repo, folder, sizeof(folder));
  if (!StartBackgroundCommand(&extraction, folder, command)) { SDL_snprintf(problem, sizeof(problem), "Couldn't run npm in %s.", folder); }
}

/* returns 1 on the frame the extraction finishes having worked */
static int UpdateExtraction(void) {
  if (!UpdateBackgroundCommand(&extraction)) { return 0; }
  if (extraction.exit_code != 0) {
    SDL_strlcpy(problem, "The extraction failed; its output says why.", sizeof(problem));
  }
  return extraction.exit_code == 0;
}

static void DrawImageField(void) {
  igSetNextItemWidth(-(CanChooseFiles() ? 90.0f : 1.0f));
  igInputText("##disc_image", image, sizeof(image), 0, 0, 0);
  if (!CanChooseFiles()) { return; }
  igSameLine(0, -1);
  if (igButton("Browse...", (ImVec2){-1, 0})) {
    ChooseDiscImage(image, sizeof(image));
  }
}

static void DrawExtractButton(const char *repo) {
  int running = IsBackgroundCommandRunning(&extraction);

  igBeginDisabled(running);
  if (igButton(running ? "Extracting..." : "Extract", (ImVec2){120, 0})) {
    StartExtraction(repo);
  }
  igEndDisabled();
}

/* returns 1 when an extraction has just finished, so the files can be checked again */
int DrawExtractStreams(const char *repo) {
  int finished;

  igText("Disc image (.bin or .iso):");
  DrawImageField();
  DrawExtractButton(repo);
  finished = UpdateExtraction();
  if (problem[0]) { igTextColored(PROBLEM_COLOUR, "%s", problem); }
  DrawCommandOutput("extract_output", &extraction);
  return finished;
}
