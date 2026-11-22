#ifndef _LAUNCHER_VERSION_CORNER_H_
#define _LAUNCHER_VERSION_CORNER_H_

/* runs the check for a newer release in the background (c1x_tools check-update,
   which asks github); does nothing for a dev build, or without the tools */
extern void StartReleaseCheck(const char *repo);
/* each frame: takes the newer release from the check's output, once it's there */
extern void FollowReleaseCheck(void);
extern void StopReleaseCheck(void);
/* the launcher's version, and a link to a newer release if the check found one */
extern void DrawVersionCorner(void);

#endif /* _LAUNCHER_VERSION_CORNER_H_ */
