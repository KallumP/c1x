# Running

To run c1, open the [launcher](launcher.md) (`build/_launcher.exe`) and click **Play**. See [building](building.md) for how to compile it.

The game needs the `.nsd`/`.nsf` files from your Crash Bandicoot disc in `streams/`. From the disc itself, copy every file in its `S0` to `S3` folders into `streams/`, renamed to lowercase.

The launcher checks for these files when it opens, and if any are missing it tells you which ones instead of showing **Play**; click **Check again** once they're in place.

If you have a disc image (`.bin` or `.iso`) made from a copy of the game you own, rather than the disc itself, the launcher can extract the files from it for you: in its missing files message, choose the image with **Browse...** (or type its path) and click **Extract**. It says how it went below, and **Play** appears once the files are all there. It reads the image directly, including raw 2352-byte-sector `.bin` dumps that many tools cannot open, and needs nothing else installed.

The game boots into the title screen, or the level chosen by the launcher's **Boot level** (the `boot_level` setting, see [Settings](settings.md)).
