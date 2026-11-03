/*
 * running other programs from the launcher: the game, which is left to run
 * on its own, and commands (node, npm) run in the background with their
 * output collected for the launcher to show
 */
#include <SDL2/SDL.h>
#include <sys/stat.h>
#include "process.h"
#ifdef _WIN32
#include <windows.h>
#else
#include <errno.h>
#include <signal.h>
#include <sys/wait.h>
#include <unistd.h>
#endif

struct process {
  SDL_mutex *lock;  /* guards output, output_len, running and exit_code */
  char output[PROCESS_OUTPUT_MAX];
  size_t output_len;
  int running;
  int exit_code;
  SDL_Thread *reader; /* reads the output until the command ends */
#ifdef _WIN32
  HANDLE handle;
  HANDLE job;         /* the command and everything it starts, to stop them all */
  HANDLE output_pipe;
#else
  pid_t pid;          /* also its process group, to stop everything it starts */
  int output_pipe;
#endif
};

static int IsFolder(const char *path) {
  struct stat info;

  return stat(path, &info) == 0 && S_ISDIR(info.st_mode);
}

#ifdef _WIN32

/* a job that kills its processes when the launcher closes its handle (or exits) */
static HANDLE CreateKillOnCloseJob() {
  JOBOBJECT_EXTENDED_LIMIT_INFORMATION limits = { 0 };
  HANDLE job;

  job = CreateJobObjectA(0, 0);
  if (!job) { return 0; }
  limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
  SetInformationJobObject(job, JobObjectExtendedLimitInformation, &limits, sizeof(limits));
  return job;
}

/* start command with cmd.exe in folder, writing to output_pipe; returns 0 if it can't */
static int StartCommand(process *p, const char *folder, const char *command,
  HANDLE output_pipe) {
  STARTUPINFOA startup = { 0 };
  PROCESS_INFORMATION started;
  char command_line[4096];

  snprintf(command_line, sizeof(command_line), "cmd.exe /s /c \"%s\"", command);
  startup.cb = sizeof(startup);
  startup.dwFlags = STARTF_USESTDHANDLES;
  startup.hStdOutput = output_pipe;
  startup.hStdError = output_pipe;
  if (!CreateProcessA(0, command_line, 0, 0, TRUE,
    CREATE_NO_WINDOW | CREATE_SUSPENDED, 0, folder, &startup, &started)) {
    return 0;
  }
  p->job = CreateKillOnCloseJob();
  if (p->job) { AssignProcessToJobObject(p->job, started.hProcess); }
  ResumeThread(started.hThread);
  CloseHandle(started.hThread);
  p->handle = started.hProcess;
  return 1;
}

static int StartWithOutputPipe(process *p, const char *folder, const char *command) {
  SECURITY_ATTRIBUTES inheritable = { sizeof(inheritable), 0, TRUE };
  HANDLE read_end, write_end;
  int started;

  if (!CreatePipe(&read_end, &write_end, &inheritable, 0)) { return 0; }
  SetHandleInformation(read_end, HANDLE_FLAG_INHERIT, 0);
  started = StartCommand(p, folder, command, write_end);
  CloseHandle(write_end); /* so reading ends when the command's copies close */
  if (!started) {
    CloseHandle(read_end);
    return 0;
  }
  p->output_pipe = read_end;
  return 1;
}

/* read some output into buf; returns how much, or 0 once there's no more */
static int ReadSomeOutput(process *p, char *buf, int size) {
  DWORD got;

  if (!ReadFile(p->output_pipe, buf, size, &got, 0)) { return 0; }
  return (int)got;
}

static int WaitForExitCode(process *p) {
  DWORD code;

  WaitForSingleObject(p->handle, INFINITE);
  if (!GetExitCodeProcess(p->handle, &code)) { return -1; }
  return (int)code;
}

static void StopEverything(process *p) {
  if (p->job) { TerminateJobObject(p->job, 1); }
  else { TerminateProcess(p->handle, 1); }
}

static void CloseHandles(process *p) {
  CloseHandle(p->output_pipe);
  CloseHandle(p->handle);
  if (p->job) { CloseHandle(p->job); }
}

/* start program in folder, left to run on its own; returns 0 if it can't */
int ProcessStartDetached(const char *folder, const char *program) {
  STARTUPINFOA startup = { 0 };
  PROCESS_INFORMATION started;
  char command_line[1024];

  snprintf(command_line, sizeof(command_line), "\"%s\"", program);
  startup.cb = sizeof(startup);
  if (!CreateProcessA(program, command_line, 0, 0, FALSE, 0, 0, folder,
    &startup, &started)) {
    return 0;
  }
  CloseHandle(started.hThread);
  CloseHandle(started.hProcess);
  return 1;
}

#else

/* in the forked child: run command with sh in folder, writing to output_pipe */
static void RunCommandInChild(const char *folder, const char *command, int fds[2]) {
  setpgid(0, 0);
  dup2(fds[1], STDOUT_FILENO);
  dup2(fds[1], STDERR_FILENO);
  close(fds[0]);
  close(fds[1]);
  if (chdir(folder) != 0) { _exit(127); }
  execl("/bin/sh", "sh", "-c", command, (char*)0);
  _exit(127);
}

static int StartWithOutputPipe(process *p, const char *folder, const char *command) {
  int fds[2];

  if (pipe(fds) != 0) { return 0; }
  p->pid = fork();
  if (p->pid < 0) {
    close(fds[0]);
    close(fds[1]);
    return 0;
  }
  if (p->pid == 0) { RunCommandInChild(folder, command, fds); }
  setpgid(p->pid, p->pid);
  close(fds[1]);
  p->output_pipe = fds[0];
  return 1;
}

/* read some output into buf; returns how much, or 0 once there's no more */
static int ReadSomeOutput(process *p, char *buf, int size) {
  ssize_t got;

  do { got = read(p->output_pipe, buf, size); } while (got < 0 && errno == EINTR);
  return got < 0 ? 0 : (int)got;
}

static int WaitForExitCode(process *p) {
  int status;

  if (waitpid(p->pid, &status, 0) < 0) { return -1; }
  if (WIFEXITED(status)) { return WEXITSTATUS(status); }
  return 128 + WTERMSIG(status);
}

static void StopEverything(process *p) {
  kill(-p->pid, SIGTERM);
}

static void CloseHandles(process *p) {
  close(p->output_pipe);
}

/* start program in folder, left to run on its own; returns 0 if it can't */
int ProcessStartDetached(const char *folder, const char *program) {
  pid_t child;
  int status;

  if (!IsFolder(folder) || access(program, X_OK) != 0) { return 0; }
  child = fork();
  if (child < 0) { return 0; }
  if (child == 0) {
    /* fork again so the program isn't the launcher's child, and needn't be waited for */
    setsid();
    if (fork() == 0 && chdir(folder) == 0) { execl(program, program, (char*)0); }
    _exit(0);
  }
  waitpid(child, &status, 0);
  return 1;
}

#endif

/* add output to what p keeps, dropping the oldest to make room */
static void KeepOutput(process *p, const char *buf, size_t size) {
  size_t drop;

  if (size > PROCESS_OUTPUT_MAX) {
    buf += size - PROCESS_OUTPUT_MAX;
    size = PROCESS_OUTPUT_MAX;
  }
  SDL_LockMutex(p->lock);
  if (p->output_len + size > PROCESS_OUTPUT_MAX) {
    drop = p->output_len + size - PROCESS_OUTPUT_MAX;
    memmove(p->output, p->output + drop, p->output_len - drop);
    p->output_len -= drop;
  }
  memcpy(p->output + p->output_len, buf, size);
  p->output_len += size;
  SDL_UnlockMutex(p->lock);
}

/* reader thread: collect the output, then the exit code once the command ends */
static int CollectOutput(void *data) {
  process *p = data;
  char buf[4096];
  int got, exit_code;

  while ((got = ReadSomeOutput(p, buf, sizeof(buf))) > 0) {
    KeepOutput(p, buf, got);
  }
  exit_code = WaitForExitCode(p);
  SDL_LockMutex(p->lock);
  p->exit_code = exit_code;
  p->running = 0;
  SDL_UnlockMutex(p->lock);
  return 0;
}

/*
 * run command (with cmd.exe on windows, sh elsewhere) in folder in the
 * background, collecting its output; returns 0 if it can't be started
 */
process *ProcessRun(const char *folder, const char *command) {
  process *p;

  if (!IsFolder(folder)) { return 0; }
  p = SDL_calloc(1, sizeof(process));
  if (!p) { return 0; }
  if (!StartWithOutputPipe(p, folder, command)) {
    SDL_free(p);
    return 0;
  }
  p->lock = SDL_CreateMutex();
  p->running = 1;
  p->reader = SDL_CreateThread(CollectOutput, "process output", p);
  return p;
}

int ProcessIsRunning(process *p) {
  int running;

  SDL_LockMutex(p->lock);
  running = p->running;
  SDL_UnlockMutex(p->lock);
  return running;
}

/* the command's exit code, once it has ended */
int ProcessExitCode(process *p) {
  int exit_code;

  SDL_LockMutex(p->lock);
  exit_code = p->exit_code;
  SDL_UnlockMutex(p->lock);
  return exit_code;
}

/* copy the newest output that fits in out (size-1 bytes and a terminating 0) */
void ProcessCopyOutput(process *p, char *out, size_t size) {
  size_t len;

  if (size == 0) { return; }
  SDL_LockMutex(p->lock);
  len = p->output_len < size-1 ? p->output_len : size-1;
  memcpy(out, p->output + p->output_len - len, len);
  SDL_UnlockMutex(p->lock);
  out[len] = 0;
}

/* stop the command and everything it started */
void ProcessStop(process *p) {
  if (ProcessIsRunning(p)) { StopEverything(p); }
}

/* stop the command if it's still running, and free p */
void ProcessFree(process *p) {
  if (!p) { return; }
  ProcessStop(p);
  SDL_WaitThread(p->reader, 0);
  CloseHandles(p);
  SDL_DestroyMutex(p->lock);
  SDL_free(p);
}
