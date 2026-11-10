#include "utest.h"
#include "launcher/streams.h"
#include "test_files.h"

#define TEST_STREAMS_REPO "build/test_launcher_streams"

static void MakeEmptyStreamFile(const char *name) {
  char path[256];

  snprintf(path, sizeof(path), "%s/streams/%s", TEST_STREAMS_REPO, name);
  WriteWholeFile(path, "");
}

static void MakeEveryStreamFile(void) {
  stream_files missing;
  int i;

  MakeFolder(TEST_STREAMS_REPO);
  MakeFolder(TEST_STREAMS_REPO "/streams");
  ListMissingStreamFiles(TEST_STREAMS_REPO, &missing);
  for (i = 0; i < missing.count; i++) {
    MakeEmptyStreamFile(missing.names[i]);
  }
}

/* whether files lists name */
static int ListsFile(const stream_files *files, const char *name) {
  int i;

  for (i = 0; i < files->count; i++) {
    if (strcmp(files->names[i], name) == 0) { return 1; }
  }
  return 0;
}

UTEST(launcher_streams, names_a_level_file_as_the_game_opens_it) {
  char name[STREAM_FILE_NAME_MAX];

  StreamFileName(0x1A, "nsd", name, sizeof(name));
  ASSERT_STREQ("s000001a.nsd", name);
}

UTEST(launcher_streams, a_repo_without_streams_misses_every_file) {
  stream_files missing;

  ListMissingStreamFiles("build/no_such_repo", &missing);
  ASSERT_EQ(STREAM_FILE_COUNT, missing.count);
  ASSERT_TRUE(ListsFile(&missing, "s0000003.nsd"));
  ASSERT_TRUE(ListsFile(&missing, "s0000003.nsf"));
}

UTEST(launcher_streams, a_repo_with_every_file_misses_none) {
  stream_files missing;

  MakeEveryStreamFile();
  ListMissingStreamFiles(TEST_STREAMS_REPO, &missing);
  ASSERT_EQ(0, missing.count);
}

UTEST(launcher_streams, lists_just_the_files_that_are_missing) {
  stream_files missing;

  MakeEveryStreamFile();
  remove(TEST_STREAMS_REPO "/streams/s0000019.nsf");
  ListMissingStreamFiles(TEST_STREAMS_REPO, &missing);
  ASSERT_EQ(1, missing.count);
  ASSERT_STREQ("s0000019.nsf", missing.names[0]);
}
