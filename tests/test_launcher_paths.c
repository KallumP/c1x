#include <sys/stat.h>
#include <utime.h>
#include "utest.h"
#include "launcher/paths.h"
#include "test_files.h"

UTEST(launcher_paths, repo_folder_is_a_windows_launchers_own_folder) {
  char repo[256];

  RepoFolderFromLauncherFolder("C:\\code\\c1x\\", repo, sizeof(repo));
  ASSERT_STREQ("C:\\code\\c1x", repo);
}

UTEST(launcher_paths, repo_folder_is_a_linux_launchers_own_folder) {
  char repo[256];

  RepoFolderFromLauncherFolder("/home/me/c1x/", repo, sizeof(repo));
  ASSERT_STREQ("/home/me/c1x", repo);
}

UTEST(launcher_paths, repo_folder_without_a_trailing_separator) {
  char repo[256];

  RepoFolderFromLauncherFolder("/home/me/c1x", repo, sizeof(repo));
  ASSERT_STREQ("/home/me/c1x", repo);
}

UTEST(launcher_paths, repo_folder_at_the_root_keeps_its_separator) {
  char repo[256];

  RepoFolderFromLauncherFolder("/", repo, sizeof(repo));
  ASSERT_STREQ("/", repo);
}

UTEST(launcher_paths, joins_a_folder_and_a_name) {
  char path[256];

  JoinPath(path, sizeof(path), "/home/me/c1x", "streams");
  ASSERT_STREQ("/home/me/c1x/streams", path);
  JoinPath(path, sizeof(path), "C:\\code\\c1x\\", "build/c1x.exe");
  ASSERT_STREQ("C:\\code\\c1x\\build/c1x.exe", path);
}

#define BUILT_REPO "build/test_launcher_built"
#define BUILT_AT   1795521120 /* a time the launcher's file is given, in seconds */

UTEST(launcher_paths, the_launchers_build_time_is_its_files_modified_time) {
  struct utimbuf times = { BUILT_AT, BUILT_AT };
  char launcher[PATH_MAX_LEN];
  time_t built;

  MakeFolder(BUILT_REPO);
  JoinPath(launcher, sizeof(launcher), BUILT_REPO, LAUNCHER_FILE_NAME);
  WriteWholeFile(launcher, "launcher");
  utime(launcher, &times);
  built = LauncherBuiltTime(BUILT_REPO);
  remove(launcher);
  ASSERT_EQ((time_t)BUILT_AT, built);
}

UTEST(launcher_paths, a_launcher_that_isnt_there_has_no_build_time) {
  ASSERT_EQ((time_t)0, LauncherBuiltTime("build/no_such_repo"));
}
