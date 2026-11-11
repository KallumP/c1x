/*
 * extracting the game's files from a disc image, from the launcher's game
 * section: a disc image field, Browse, and Extract saying how it went
 */
#include <SDL2/SDL.h>
#define CIMGUI_DEFINE_ENUMS_AND_STRUCTS
#include "cimgui.h"
#include "extract_section.h"
#include "extraction.h"
#include "file_dialog.h"
#include "paths.h"
#include "ui.h"

static char image[PATH_MAX_LEN];
static extraction job;
static char problem[PATH_MAX_LEN + 64]; /* why the extraction couldn't start, or "" */

static void StartExtractingImage(const char *repo) {
  char streams[PATH_MAX_LEN];

  problem[0] = 0;
  if (!image[0]) {
    SDL_strlcpy(problem, "Choose a disc image first.", sizeof(problem));
    return;
  }
  JoinPath(streams, sizeof(streams), repo, "streams");
  if (!StartExtraction(&job, image, streams)) {
    SDL_strlcpy(problem, "Couldn't start extracting.", sizeof(problem));
  }
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
  int running = IsExtractionRunning(&job);
  const char *label = "Extract";

  if (running) { label = "Extracting..."; }
  igBeginDisabled(running);
  if (igButton(label, (ImVec2){120, 0})) { StartExtractingImage(repo); }
  igEndDisabled();
}

static void DrawExtractionResult(void) {
  if (problem[0]) {
    igTextColored(PROBLEM_COLOUR, "%s", problem);
  } else if (!IsExtractionRunning(&job) && job.message[0]) {
    if (job.file_count < 0) {
      igTextColored(PROBLEM_COLOUR, "%s", job.message);
    } else {
      igTextWrapped("%s", job.message);
    }
  }
}

/* returns 1 when an extraction has just finished, so the files can be checked again */
int DrawExtractStreams(const char *repo) {
  int finished;

  igText("Disc image (.bin or .iso):");
  DrawImageField();
  DrawExtractButton(repo);
  finished = UpdateExtraction(&job);
  DrawExtractionResult();
  return finished && job.file_count > 0;
}
