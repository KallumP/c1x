#include "utest.h"
#include "launcher/paths.h"

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
