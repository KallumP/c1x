#include "utest.h"
#include "launcher/node.h"

UTEST(launcher_node, reads_the_major_version) {
  ASSERT_EQ(22, NodeMajorVersion("v22.16.0\r\n"));
}

UTEST(launcher_node, no_version_from_other_output) {
  ASSERT_EQ(0, NodeMajorVersion("'node' is not recognized as an internal or external command"));
  ASSERT_EQ(0, NodeMajorVersion(""));
}

UTEST(launcher_node, eighteen_or_later_is_supported) {
  ASSERT_TRUE(IsNodeVersionSupported(18));
  ASSERT_TRUE(IsNodeVersionSupported(22));
  ASSERT_FALSE(IsNodeVersionSupported(16));
  ASSERT_FALSE(IsNodeVersionSupported(0));
}
