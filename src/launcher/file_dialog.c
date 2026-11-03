/*
 * choosing a file with the system's file dialog (windows only, for now)
 */
#include "file_dialog.h"
#ifdef _WIN32
#include <windows.h>
#include <commdlg.h>

int CanChooseFiles(void) {
  return 1;
}

/* ask for a .bin or .iso into path; returns 0 if none was chosen */
int ChooseDiscImage(char *path, size_t size) {
  OPENFILENAMEA dialog = { 0 };

  path[0] = 0;
  dialog.lStructSize = sizeof(dialog);
  dialog.lpstrFilter = "Disc images (*.bin, *.iso)\0*.bin;*.iso\0All files\0*.*\0";
  dialog.lpstrFile = path;
  dialog.nMaxFile = (DWORD)size;
  dialog.lpstrTitle = "Choose a disc image of Crash Bandicoot";
  dialog.Flags = OFN_FILEMUSTEXIST | OFN_PATHMUSTEXIST | OFN_NOCHANGEDIR;
  return GetOpenFileNameA(&dialog);
}

#else

int CanChooseFiles(void) {
  return 0;
}

int ChooseDiscImage(char *path, size_t size) {
  return 0;
}

#endif
