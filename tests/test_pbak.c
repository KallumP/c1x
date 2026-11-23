#include <stddef.h>
#include "utest.h"
#include "formats/pbak.h"

/* the ps1 game's demo entries: a 16 byte header, the saved level state (1276
   bytes), the draw stamp, crash's bound and the ticks per frame, then the
   recorded frames */
#define PBAK_FRAMES_OFFSET 1324

UTEST(pbak, a_demo_entrys_frames_start_where_the_ps1_wrote_them) {
  ASSERT_EQ(PBAK_FRAMES_OFFSET, (int)offsetof(pbak_header, frames));
}
