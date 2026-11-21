#ifndef _PC_SAVEPOINT_H_
#define _PC_SAVEPOINT_H_

#include "common.h"
#include "gool.h"

/*
 * a bonus round's "SAVE POINT x% COMPLETE!" (pc): Tawna makes it when crash
 * waits by the end pad, as a card screen object (exec CardC, subtype 34) with
 * the picture and the text as its children. nothing removes it, so it stayed
 * drawn on the save screen once that opened (it's menu text); it goes then
 */
#define CARD_EXEC_EID       0x4c5366cd /* CardC: the card screens' exec */
#define SAVE_POINT_SUBTYPE  34         /* its SAVE POINT text, with its picture and text children */

extern int SavePointTextGoes(gool_object *obj, int card_screen_up);

#endif /* _PC_SAVEPOINT_H_ */
