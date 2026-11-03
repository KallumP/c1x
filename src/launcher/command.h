#ifndef _LAUNCHER_COMMAND_H_
#define _LAUNCHER_COMMAND_H_

#include "process.h"

/* a command run in the background, keeping its output and exit code once it's finished */
typedef struct {
  process *process; /* while it runs */
  char output[PROCESS_OUTPUT_MAX];
  int exit_code;
} background_command;

extern int StartBackgroundCommand(background_command *c, const char *folder,
  const char *command);
extern int IsBackgroundCommandRunning(const background_command *c);
extern int UpdateBackgroundCommand(background_command *c);
extern void StopBackgroundCommand(background_command *c);

#endif /* _LAUNCHER_COMMAND_H_ */
