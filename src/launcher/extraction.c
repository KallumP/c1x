/*
 * extracting the game's files on a thread (see extract.c), so the launcher
 * keeps drawing while a disc image is read
 */
#include "extraction.h"
#include "extract.h"

static int RunExtraction(void *data) {
  extraction *job = data;

  job->file_count = ExtractStreams(job->image, job->out_folder, job->message,
    sizeof(job->message));
  SDL_AtomicSet(&job->finished, 1);
  return 0;
}

int StartExtraction(extraction *job, const char *image, const char *out_folder) {
  if (IsExtractionRunning(job)) { return 0; }
  SDL_strlcpy(job->image, image, sizeof(job->image));
  SDL_strlcpy(job->out_folder, out_folder, sizeof(job->out_folder));
  job->message[0] = 0;
  job->file_count = 0;
  SDL_AtomicSet(&job->finished, 0);
  job->thread = SDL_CreateThread(RunExtraction, "extract_streams", job);
  return job->thread != 0;
}

int IsExtractionRunning(const extraction *job) {
  return job->thread != 0;
}

int UpdateExtraction(extraction *job) {
  if (!job->thread || !SDL_AtomicGet(&job->finished)) { return 0; }
  SDL_WaitThread(job->thread, 0);
  job->thread = 0;
  return 1;
}
