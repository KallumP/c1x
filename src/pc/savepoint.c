/*
 * a bonus round's SAVE POINT text goes once a save screen opens (pc). see savepoint.h
 */
#include "savepoint.h"

#define OBJECT_HANDLE_TYPE 1 /* an object's handle type; 0 is a free slot */

static int IsLiveObject(gool_object *obj) {
  return obj->handle.type == OBJECT_HANDLE_TYPE && obj->global;
}

static int IsSavePointText(gool_object *obj) {
  return obj->global->eid == CARD_EXEC_EID && obj->subtype == SAVE_POINT_SUBTYPE;
}

/* whether obj is the SAVE POINT text, which goes once a card screen is up */
int SavePointTextGoes(gool_object *obj, int card_screen_up) {
  if (!card_screen_up) { return 0; }
  return IsLiveObject(obj) && IsSavePointText(obj);
}
