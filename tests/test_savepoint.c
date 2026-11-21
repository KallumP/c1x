#include "utest.h"
#include "pc/savepoint.h"

#define OBJECT_HANDLE_TYPE 1 /* an object's handle type; 0 is a free slot */
#define OTHER_EXEC_EID     0x4e938ccd /* DispC: the hud */
#define SAVE_SCREEN_SUBTYPE 0         /* the save screen itself */

/* objects are big (their registers), so not on the stack */
static gool_object obj;
static entry exec;

static void MakeObject(eid_t exec_eid, int subtype) {
  memset(&obj, 0, sizeof(obj));
  memset(&exec, 0, sizeof(exec));
  exec.eid = exec_eid;
  obj.global = &exec;
  obj.handle.type = OBJECT_HANDLE_TYPE;
  obj.subtype = subtype;
}

UTEST(savepoint, the_save_point_text_goes_once_a_card_screen_is_up) {
  MakeObject(CARD_EXEC_EID, SAVE_POINT_SUBTYPE);
  ASSERT_TRUE(SavePointTextGoes(&obj, 1));
}

UTEST(savepoint, the_save_point_text_stays_before_the_card_screen) {
  MakeObject(CARD_EXEC_EID, SAVE_POINT_SUBTYPE);
  ASSERT_FALSE(SavePointTextGoes(&obj, 0));
}

UTEST(savepoint, the_save_screen_itself_stays) {
  MakeObject(CARD_EXEC_EID, SAVE_SCREEN_SUBTYPE);
  ASSERT_FALSE(SavePointTextGoes(&obj, 1));
}

UTEST(savepoint, another_exec_with_the_same_subtype_stays) {
  MakeObject(OTHER_EXEC_EID, SAVE_POINT_SUBTYPE);
  ASSERT_FALSE(SavePointTextGoes(&obj, 1));
}

UTEST(savepoint, a_free_object_slot_is_left_alone) {
  MakeObject(CARD_EXEC_EID, SAVE_POINT_SUBTYPE);
  obj.handle.type = 0;
  ASSERT_FALSE(SavePointTextGoes(&obj, 1));
}
