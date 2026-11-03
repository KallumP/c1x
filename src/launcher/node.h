#ifndef _LAUNCHER_NODE_H_
#define _LAUNCHER_NODE_H_

#define NODE_MIN_MAJOR_VERSION 18 /* the level editor's tools need 18 or later */

extern int NodeMajorVersion(const char *version_output);
extern int IsNodeVersionSupported(int major_version);

#endif /* _LAUNCHER_NODE_H_ */
