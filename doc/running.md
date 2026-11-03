# Running

To run c1, open the [launcher](launcher.md) (`build/launcher.exe`) and click **Play**. See [building](building.md) for how to compile it.

Copies of the asset files from the Crash Bandicoot game disc are needed for the game to function. Asset files are the (.NSD/.NSF) files located in the `/S0`, `/S1`, `/S2`, and `/S3` directories, respectively. Each of these files must be copied from its respective `/S*` directory into the `/streams` directory. Additionally, after copying files to the `/streams` directory, they must renamed from the uppercase format `S00000%%.NS[F,D]` to the lowercase format `s00000%%.ns[f,d]`.

If you have a disc image (`.bin` or `.iso`) made from a copy of the game you own, rather than the disc itself, `npm run extract-streams` does all of the above in one step. It reads the image directly, including raw 2352-byte-sector `.bin` dumps that many tools cannot open. It needs [Node.js](https://nodejs.org/) 18 or later; from `tools/level_editor/`, run `npm install` once, then:

```
npm run extract-streams -- path/to/crash.bin
```

If any asset files are missing, the launcher lists them instead of showing **Play**; click **Check again** once they're in place. Started some other way, the game shows a *"Could not open ./streams/…"* error naming the missing file and exits.

The game boots into the title screen, or the level chosen by the launcher's **Boot level** (the `boot_level` setting, see [Settings](settings.md)).
