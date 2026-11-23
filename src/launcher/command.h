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

/* what a tools command (tools.h) that couldn't be made says: the only reason is a
   quote in the project folder's path */
#define UNQUOTABLE_FOLDER "The project's folder has a quote in its path."

/* starts command in folder as run, if there is one (has_command), saying why in
   problem if it can't, and clearing problem if it can; whether it started */
extern int StartToolsCommand(background_command *run, const char *folder, int has_command,
  const char *command, char *problem, size_t size);

#endif /* _LAUNCHER_COMMAND_H_ */
