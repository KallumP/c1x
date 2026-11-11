/*
 * extracting the game's files into streams/ from a disc image of your own copy:
 * every .NSD and .NSF in the S0-S3 folders, named in lower case
 */
#include <SDL2/SDL.h>
#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/stat.h>
#ifdef _WIN32
#include <direct.h>
#endif
#include "extract.h"
#include "disc_image.h"
#include "level_editor.h"
#include "paths.h"

#ifdef _WIN32
#define QUOTE '"'  /* cmd.exe */
#else
#define QUOTE '\'' /* sh, which expands nothing in single quotes */
#endif

#define FOLDER_ENTRIES_MAX 512
#define STREAM_FILES_MAX 512

/* the stream files found on a disc */
typedef struct {
  disc_entry files[STREAM_FILES_MAX];
  int count;
} stream_file_list;

/* the command extracting image's files, installing the script's packages
   first if need be; returns 0 for no image, or one that can't be quoted */
int ExtractStreamsCommand(const char *repo, const char *image, char *command,
  size_t size) {
  const char *install;

  if (!image[0] || SDL_strchr(image, QUOTE)) { return 0; }
  install = AreLevelEditorPackagesInstalled(repo) ? "" : "npm install && ";
  SDL_snprintf(command, size, "%snpm run extract-streams -- %c%s%c",
    install, QUOTE, image, QUOTE);
  return 1;
}

static int IsStreamFolder(const disc_entry *entry) {
  static const char *names[] = { "S0", "S1", "S2", "S3" };
  int i;

  if (!entry->is_folder) { return 0; }
  for (i = 0; i < 4; i++) {
    if (SDL_strcmp(entry->name, names[i]) == 0) { return 1; }
  }
  return 0;
}

static int IsStreamFile(const disc_entry *entry) {
  size_t length = SDL_strlen(entry->name);
  const char *extension;

  if (entry->is_folder || length < 4) { return 0; }
  extension = entry->name + length - 4;
  return SDL_strcasecmp(extension, ".NSD") == 0 || SDL_strcasecmp(extension, ".NSF") == 0;
}

/* adds folder's stream files to list; 0 if it can't be read */
static int AddStreamFilesIn(disc_image *image, const disc_entry *folder,
  stream_file_list *list) {
  static disc_entry entries[FOLDER_ENTRIES_MAX];
  int count = ReadFolderEntries(image, folder, entries, FOLDER_ENTRIES_MAX);
  int i;

  if (count < 0) { return 0; }
  for (i = 0; i < count && list->count < STREAM_FILES_MAX; i++) {
    if (IsStreamFile(&entries[i])) { list->files[list->count++] = entries[i]; }
  }
  return 1;
}

/* the stream files in the root's S0-S3 folders; 0 if a folder can't be read */
static int FindStreamFiles(disc_image *image, const disc_entry *root,
  stream_file_list *list) {
  static disc_entry folders[FOLDER_ENTRIES_MAX];
  int count = ReadFolderEntries(image, root, folders, FOLDER_ENTRIES_MAX);
  int i;

  list->count = 0;
  if (count < 0) { return 0; }
  for (i = 0; i < count; i++) {
    if (IsStreamFolder(&folders[i]) && !AddStreamFilesIn(image, &folders[i], list)) { return 0; }
  }
  return 1;
}

static void MakeFolder(const char *path) {
#ifdef _WIN32
  _mkdir(path);
#else
  mkdir(path, 0777);
#endif
}

static void LowerCaseName(const char *name, char *lower, size_t size) {
  size_t i;

  for (i = 0; name[i] && i + 1 < size; i++) { lower[i] = tolower((unsigned char)name[i]); }
  lower[i] = 0;
}

static int WriteFileData(const char *path, const unsigned char *data, unsigned int size) {
  FILE *file = fopen(path, "wb");
  int written;

  if (!file) { return 0; }
  written = fwrite(data, 1, size, file) == size;
  return fclose(file) == 0 && written;
}

typedef enum { COPY_DONE, COPY_ENDS_EARLY, COPY_CANT_WRITE } copy_result;

static copy_result CopyStreamFile(disc_image *image, const disc_entry *file,
  const char *out_folder, char *path, size_t path_size) {
  char name[DISC_NAME_MAX];
  unsigned char *data = malloc(file->size + 1);
  copy_result result = COPY_DONE;

  LowerCaseName(file->name, name, sizeof(name));
  JoinPath(path, path_size, out_folder, name);
  if (!data || !ReadDiscData(image, file->lba, file->size, data)) {
    result = COPY_ENDS_EARLY;
  } else if (!WriteFileData(path, data, file->size)) {
    result = COPY_CANT_WRITE;
  }
  free(data);
  return result;
}

static int CopyStreamFiles(disc_image *image, const stream_file_list *list,
  const char *image_path, const char *out_folder, char *message, size_t size) {
  char path[PATH_MAX_LEN];
  int i;

  MakeFolder(out_folder);
  for (i = 0; i < list->count; i++) {
    copy_result result = CopyStreamFile(image, &list->files[i], out_folder, path, sizeof(path));

    if (result == COPY_ENDS_EARLY) {
      SDL_snprintf(message, size, "%s ends early; is it a complete disc image?", image_path);
      return -1;
    }
    if (result == COPY_CANT_WRITE) {
      SDL_snprintf(message, size, "Couldn't write %s.", path);
      return -1;
    }
  }
  SDL_snprintf(message, size, "Extracted %d files to %s.", list->count, out_folder);
  return list->count;
}

static int ExtractFromOpenImage(disc_image *image, const char *image_path,
  const char *out_folder, char *message, size_t size) {
  static stream_file_list list;
  disc_entry root;

  if (!ReadRootFolder(image, &root)) {
    SDL_snprintf(message, size, "%s is not a recognised disc image (no ISO9660 volume found).", image_path);
    return -1;
  }
  if (!FindStreamFiles(image, &root, &list)) {
    SDL_snprintf(message, size, "%s ends early; is it a complete disc image?", image_path);
    return -1;
  }
  if (list.count == 0) {
    SDL_strlcpy(message, "No .NSD/.NSF files found in S0-S3; is this a Crash Bandicoot disc?", size);
    return -1;
  }
  return CopyStreamFiles(image, &list, image_path, out_folder, message, size);
}

int ExtractStreams(const char *image_path, const char *out_folder, char *message,
  size_t size) {
  disc_image image;
  int count;

  if (!OpenDiscImage(&image, image_path)) {
    SDL_snprintf(message, size, "Couldn't open %s.", image_path);
    return -1;
  }
  count = ExtractFromOpenImage(&image, image_path, out_folder, message, size);
  CloseDiscImage(&image);
  return count;
}
