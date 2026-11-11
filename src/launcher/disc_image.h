#ifndef _LAUNCHER_DISC_IMAGE_H_
#define _LAUNCHER_DISC_IMAGE_H_

/*
 * reading a disc image's ISO9660 file system: a .bin (raw 2352 byte sectors)
 * or an .iso (2048 byte sectors)
 */
#include <stdio.h>

#define DISC_NAME_MAX 32

/* an open disc image, and where its sectors' user data is */
typedef struct {
  FILE *file;
  long sector_size; /* 2048, or 2352 for raw sectors */
  long data_offset; /* the user data's offset in each sector */
} disc_image;

/* a file or folder on the disc; name without its ;1 version */
typedef struct {
  char name[DISC_NAME_MAX];
  unsigned int lba;
  unsigned int size;
  int is_folder;
} disc_entry;

extern int OpenDiscImage(disc_image *image, const char *path);
extern void CloseDiscImage(disc_image *image);

/* length bytes of user data from sector lba on; 0 if the image ends first */
extern int ReadDiscData(disc_image *image, unsigned int lba, unsigned int length,
  unsigned char *out);

/* 0 if there's no ISO9660 volume */
extern int ReadRootFolder(disc_image *image, disc_entry *root);

/* the folder's entries, without . and .., up to max; -1 if it can't be read */
extern int ReadFolderEntries(disc_image *image, const disc_entry *folder,
  disc_entry *entries, int max);

#endif /* _LAUNCHER_DISC_IMAGE_H_ */
