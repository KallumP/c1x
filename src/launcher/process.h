#ifndef _LAUNCHER_PROCESS_H_
#define _LAUNCHER_PROCESS_H_

#include <stddef.h>

#define PROCESS_OUTPUT_MAX 65536 /* bytes of output kept, the newest */

/* a command run in the background, collecting its output */
typedef struct process process;

extern int ProcessStartDetached(const char *folder, const char *program);
extern process *ProcessRun(const char *folder, const char *command);
extern int ProcessIsRunning(process *p);
extern int ProcessExitCode(process *p);
extern void ProcessCopyOutput(process *p, char *out, size_t size);
extern void ProcessStop(process *p);
extern void ProcessFree(process *p);

#endif /* _LAUNCHER_PROCESS_H_ */
