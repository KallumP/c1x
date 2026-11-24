#ifndef _LAUNCHER_VERSION_CORNER_H_
#define _LAUNCHER_VERSION_CORNER_H_

/* runs the check for a newer release in the background (c1x_tools check-update,
   which asks github); does nothing for a dev build, or without the tools */
extern void StartReleaseCheck(const char *repo);
/* reads when the launcher in repo was built, for a dev build's corner */
extern void ReadLauncherBuiltTime(const char *repo);
/* each frame: takes the newer release from the check's output, and the new
   version's folder from the download's, once they're there */
extern void FollowNewerRelease(void);
/* stops the check and the download, if they're running */
extern void StopNewerRelease(void);
/* the launcher's version, and a button installing a newer release if the check
   found one */
extern void DrawVersionCorner(void);

#endif /* _LAUNCHER_VERSION_CORNER_H_ */
