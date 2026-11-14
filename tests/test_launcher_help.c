#include <string.h>
#include "utest.h"
#include "launcher/help.h"
#include "test_files.h"

#define TEST_HELP_REPO "build/test_launcher_help"

UTEST(launcher_help, a_windows_path_as_a_file_address) {
  char url[256];

  FileUrl("C:\\games\\c1x\\README.html", url, sizeof(url));
  ASSERT_STREQ("file:///C:/games/c1x/README.html", url);
}

UTEST(launcher_help, a_linux_path_as_a_file_address) {
  char url[256];

  FileUrl("/home/me/c1x/README.html", url, sizeof(url));
  ASSERT_STREQ("file:///home/me/c1x/README.html", url);
}

UTEST(launcher_help, spaces_and_hashes_in_a_path_are_escaped) {
  char url[256];

  FileUrl("C:\\my games\\c1x #2\\README.html", url, sizeof(url));
  ASSERT_STREQ("file:///C:/my%20games/c1x%20%232/README.html", url);
}

UTEST(launcher_help, a_release_opens_its_readme) {
  char url[512];

  MakeFolder(TEST_HELP_REPO);
  WriteWholeFile(TEST_HELP_REPO "/README.html", "<html></html>");
  HelpAddress(TEST_HELP_REPO, url, sizeof(url));
  ASSERT_EQ(0, strncmp(url, "file:///", 8));
  ASSERT_STREQ("README.html", url + strlen(url) - strlen("README.html"));
}

UTEST(launcher_help, a_folder_without_one_opens_the_docs_on_github) {
  char url[512];

  HelpAddress("build/no_such_repo", url, sizeof(url));
  ASSERT_STREQ(HELP_ONLINE_ADDRESS, url);
}
