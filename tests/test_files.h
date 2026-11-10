#ifndef _TEST_FILES_H_
#define _TEST_FILES_H_

/*
 * file and folder helpers shared by the tests (paths are from the project root).
 * reading and writing whole files uses the launcher's text_file helpers:
 * WriteWholeFile(path, text) and ReadWholeFile(path), whose text is SDL_free'd.
 */
#include "launcher/text_file.h"

/* make a folder; fine if it already exists */
extern void MakeFolder(const char *path);

/* make repo/tools/level_editor/node_modules, as after the editor's npm install */
extern void MakeRepoWithNodeModules(const char *repo);

#endif /* _TEST_FILES_H_ */
