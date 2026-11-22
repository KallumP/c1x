#ifndef _LAUNCHER_VERSION_H_
#define _LAUNCHER_VERSION_H_

/* the version the launcher was built as for a release, such as "1.3" (make
   C1X_VERSION=1.3, as release.bat does); "" for a build that isn't a release */
extern const char *LauncherVersion(void);

/* whether the launcher was run as c1x_launcher --version, to print its version
   (for the release script) instead of opening its window */
extern int IsVersionAsked(int argc, char *argv[]);

#endif /* _LAUNCHER_VERSION_H_ */
