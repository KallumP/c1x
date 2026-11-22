# the launcher's version stamp (see doc/releasing.md), included by the Makefile:
# a file, VERSION_STAMP, holding the version last built, so that what's built
# from C1X_VERSION (src/launcher/version.o, which depends on the stamp) is
# built again when the version changes, and only then. tests/version_stamp.sh
# tests it on its own.
#
# FORCE has no recipe and isn't a file, so the stamp's recipe runs on every
# make; it only writes the stamp when the version isn't the one in it, so the
# stamp's time only changes with the version
.PHONY: FORCE
FORCE:
$(VERSION_STAMP): FORCE
	@mkdir -p $(dir $@)
	@{ [ -f $@ ] && [ "$$(cat $@)" = '$(C1X_VERSION)' ]; } || echo '$(C1X_VERSION)' > $@
