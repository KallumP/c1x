#!/usr/bin/env bash
# Rebuild c1x on Linux: the game (build/c1x), the launcher (c1x_launcher) and
# the tools (build/c1x_tools and the level editor's page; see doc/building.md).
#
#   ./rebuild.sh          build whatever changed
#   ./rebuild.sh clean    remove all build output first, then build everything
#   ./rebuild.sh test     build and run the unit tests
#
# The tools are a copy of node with c1x's scripts put in it (the level build, the
# level editor and the check for a newer release), which
# needs node as one whole program. Some distributions' node (Fedora's, for one)
# is a small program that loads node from libnode.so, which can't be used. With
# one of those, this downloads node from nodejs.org (NODE_VERSION, checked
# against its published checksums) into ~/.cache/c1x and builds with that.

set -euo pipefail

NODE_VERSION="${NODE_VERSION:-v22.23.1}"
SEA_FUSE="NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2" # what node has in it when it can be made into the tools
TOOLS_OUT="build/c1x_tools"

cd "$(dirname "$0")"

target=""
case "${1:-}" in
  "") ;;
  clean|test) target="$1" ;;
  *) echo "Unknown option \"$1\". Use: ./rebuild.sh [clean|test]"; exit 1 ;;
esac

# whether a node program can be made into the tools: it has the fuse in it
can_make_tools() {
  [ -f "$1" ] && grep -qa "$SEA_FUSE" "$1"
}

# node's name for this machine, for its download
node_arch() {
  case "$(uname -m)" in
    x86_64) echo x64 ;;
    aarch64) echo arm64 ;;
    *) return 1 ;;
  esac
}

# downloads node from nodejs.org into the cache, if it isn't there, and prints its bin folder
download_node() {
  local arch name cache folder
  arch="$(node_arch)" || { echo "No node download for $(uname -m); install node from nodejs.org." >&2; return 1; }
  name="node-$NODE_VERSION-linux-$arch"
  cache="${XDG_CACHE_HOME:-$HOME/.cache}/c1x"
  folder="$cache/$name"
  if [ ! -x "$folder/bin/node" ]; then
    echo "Downloading node $NODE_VERSION from nodejs.org, to make the tools with..." >&2
    mkdir -p "$cache"
    (
      cd "$cache"
      curl -fsSLO "https://nodejs.org/dist/$NODE_VERSION/$name.tar.xz"
      curl -fsSL "https://nodejs.org/dist/$NODE_VERSION/SHASUMS256.txt" | grep " $name.tar.xz\$" | sha256sum -c --quiet -
      tar xf "$name.tar.xz"
      rm "$name.tar.xz"
    ) >&2
  fi
  echo "$folder/bin"
}

# use a node that can be made into the tools, if there's node at all (without
# it, make builds the rest and says it's skipping the tools)
if command -v node >/dev/null; then
  if ! can_make_tools "$(node -p process.execPath)"; then
    PATH="$(download_node):$PATH"
    export PATH
  fi
fi

# a failed tools build can leave a plain copy of node behind, which make would
# take as up to date
if [ -f "$TOOLS_OUT" ] && ! can_make_tools "$TOOLS_OUT"; then
  rm "$TOOLS_OUT"
fi

result=0
if [ "$target" = "clean" ]; then
  make clean || true
  make -j"$(nproc)" || result=$?
else
  make -j"$(nproc)" $target || result=$?
fi

echo
if [ "$result" -eq 0 ]; then
  if [ "$target" = "test" ]; then
    echo "Tests passed."
  else
    echo "Build succeeded: c1x_launcher, build/c1x and $TOOLS_OUT"
  fi
else
  echo "Failed with exit code $result."
fi
exit "$result"
