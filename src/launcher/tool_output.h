#ifndef _LAUNCHER_TOOL_OUTPUT_H_
#define _LAUNCHER_TOOL_OUTPUT_H_

/*
 * reading what c1x's tools say (tools.h): its lines, and the numbers and the
 * tab-separated fields in them
 */
#include <stddef.h>

/* how many digits text starts with */
extern size_t DigitCount(const char *text);

/* how many characters text has before its line ends, or it does */
extern size_t LineLength(const char *text);

/* how many characters text has before a tab, or its line's end */
extern size_t FieldLength(const char *text);

#endif /* _LAUNCHER_TOOL_OUTPUT_H_ */
