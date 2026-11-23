/*
 * a command run in the background for a launcher section, such as npm install,
 * keeping its output and exit code once it's finished for the section to show
 */
#include <SDL2/SDL.h>
#include "command.h"

/* returns 0 if it can't start, e.g. folder is missing */
int StartBackgroundCommand(background_command *c, const char *folder,
  const char *command) {
  StopBackgroundCommand(c);
  c->output[0] = 0;
  c->exit_code = 0;
  c->process = ProcessRun(folder, command);
  return c->process != 0;
}

int IsBackgroundCommandRunning(const background_command *c) {
  return c->process && ProcessIsRunning(c->process);
}

/* copy its newest output; returns 1 on the update that sees it finish */
int UpdateBackgroundCommand(background_command *c) {
  int running;

  if (!c->process) { return 0; }
  running = ProcessIsRunning(c->process); /* before copying, so a finished one's output is all there */
  ProcessCopyOutput(c->process, c->output, sizeof(c->output));
  if (running) { return 0; }
  c->exit_code = ProcessExitCode(c->process);
  ProcessFree(c->process);
  c->process = 0;
  return 1;
}

/* stop it, and everything it started */
void StopBackgroundCommand(background_command *c) {
  if (!c->process) { return; }
  ProcessFree(c->process);
  c->process = 0;
}

int StartToolsCommand(background_command *run, const char *folder, int has_command,
  const char *command, char *problem, size_t size) {
  problem[0] = 0;
  if (!has_command) {
    SDL_strlcpy(problem, UNQUOTABLE_FOLDER, size);
    return 0;
  }
  if (!StartBackgroundCommand(run, folder, command)) {
    SDL_snprintf(problem, size, "Couldn't run %s.", command);
    return 0;
  }
  return 1;
}
