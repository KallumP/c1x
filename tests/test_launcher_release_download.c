#include <string.h>
#include "utest.h"
#include "launcher/release_download.h"
#include "test_tools_command.h"

UTEST(launcher_release_download, runs_from_the_tools_with_the_version) {
  char command[512];

  ASSERT_TRUE(DownloadReleaseCommand(REPO, "1.5", command, sizeof(command)));
  ASSERT_STREQ(TOOLS " download-release 1.5", command);
}

UTEST(launcher_release_download, isnt_run_for_what_isnt_a_version) {
  char command[512];

  ASSERT_FALSE(DownloadReleaseCommand(REPO, "1.5 & calc", command, sizeof(command)));
}

UTEST(launcher_release_download, finds_the_new_versions_folder) {
  char folder[256];

  ASSERT_TRUE(FindInstalledRelease("installed release: C:\\Games\\c1x-1.5\r\n",
    folder, sizeof(folder)));
  ASSERT_STREQ("C:\\Games\\c1x-1.5", folder);
}

UTEST(launcher_release_download, finds_nothing_before_it_says_where) {
  char folder[256];

  ASSERT_FALSE(FindInstalledRelease("couldn't download c1x 1.5: the download answered 404\n",
    folder, sizeof(folder)));
}

UTEST(launcher_release_download, finds_nothing_while_the_line_isnt_all_there) {
  char folder[256];
  const char *output;

  output = "installed release: C:\\Gam";
  ASSERT_FALSE(FindInstalledRelease(output, folder, sizeof(folder)));
}

UTEST(launcher_release_download, finds_nothing_when_the_folder_is_too_long_to_keep) {
  char folder[8];

  ASSERT_FALSE(FindInstalledRelease("installed release: C:\\Games\\c1x-1.5\n",
    folder, sizeof(folder)));
}
