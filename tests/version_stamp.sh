#!/bin/sh
# tests the launcher's version stamp (version_stamp.mk, see doc/releasing.md):
# version.o is built again when C1X_VERSION changes, and only then. make test
# runs it from the project folder.
#
# a makefile of its own in build/test_version_stamp stands in for the real one:
# it includes the stamp rule, and its version.o rule writes the version to the
# file instead of compiling, so what version.o holds says which build made it
set -e
unset MAKEFLAGS MFLAGS # not the make test's, for the makes here

dir=build/test_version_stamp
rm -rf "$dir"
mkdir -p "$dir"
cp version_stamp.mk "$dir/"
cat > "$dir/Makefile" <<'MAKEFILE'
VERSION_STAMP = stamp
include version_stamp.mk
version.o: version.c $(VERSION_STAMP)
	@echo '$(C1X_VERSION)' > $@
MAKEFILE
touch "$dir/version.c"

fail() {
  echo "version stamp test: $1"
  exit 1
}

# makes version.o with the version, as make C1X_VERSION=1.3 does
build_as() {
  (cd "$dir" && make -s version.o C1X_VERSION="$1")
}

# fails unless version.o holds what's expected (what the last build wrote)
version_o_holds() {
  [ "$(cat "$dir/version.o")" = "$1" ] || fail "version.o holds '$(cat "$dir/version.o")', not '$1', $2"
}

build_as 1.3
version_o_holds 1.3 "after the first build"
[ "$(cat "$dir/stamp")" = 1.3 ] || fail "the stamp doesn't hold the version built"

echo untouched > "$dir/version.o"
build_as 1.3
version_o_holds untouched "so version.o was built again with the same version"

build_as 1.4
version_o_holds 1.4 "so version.o wasn't built again with a new version"

build_as ""
version_o_holds "" "so version.o wasn't built again without a version"

echo "version stamp test: passed"
