#include "utest.h"
#include "launcher/level_editor.h"

UTEST(launcher_editor_address, found_in_vites_output) {
  char address[64];

  ASSERT_TRUE(FindLevelEditorAddress(
    "  VITE v5.4.0  ready in 300 ms\n\n  -> Local:   http://localhost:5173/\n  -> Network: use --host to expose\n",
    address, sizeof(address)));
  ASSERT_STREQ("http://localhost:5173/", address);
}

UTEST(launcher_editor_address, found_through_colour_codes) {
  char address[64];

  ASSERT_TRUE(FindLevelEditorAddress(
    "  Local:   \x1b[36mhttp://localhost:\x1b[1m5174\x1b[22m/\x1b[39m\r\n",
    address, sizeof(address)));
  ASSERT_STREQ("http://localhost:5174/", address);
}

UTEST(launcher_editor_address, not_found_before_its_ready) {
  char address[64];

  ASSERT_FALSE(FindLevelEditorAddress("> level-editor@0.0.0 dev\n> vite\n", address, sizeof(address)));
}
