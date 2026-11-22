# Releasing

A release is a zip players download from the repository's GitHub **Releases** page: the built launcher, game and tools (the level build and level editor, `c1x_tools.exe`), ready to run on Windows without installing anything (see [What's in the zip](#whats-in-the-zip)).

## Making a release

1. On `master`, pulled, with nothing uncommitted.
2. Pick the version, two numbers like `1.3`: the first number for big changes, the second for everything else.
3. On Windows, run `release.bat` from the project folder with the version, or double-click it and type the version when it asks:

   ```
   release.bat 1.3
   ```

   It builds everything first with `rebuild.bat` (see [Building](building.md)), so the launcher, the game, `c1x_tools.exe` and the level editor's page match `master`; it needs MSYS2 and Node.js (players don't). The launcher is built as that version (see [The launcher's version](#the-launchers-version)). Then it copies the release's files into `release/c1x-1.3/` (in the project folder, beside `release.bat`) and zips that folder to `release/c1x-1.3.zip`. If the build fails, or something the release needs isn't there, it says so and makes no zip.

   To make the zip without building, run `npm run release -- 1.3` in `tools/level_editor`. It makes no zip unless the launcher there was built as 1.3.
4. Try the zip as a player would: unzip it into an empty folder (on a PC without MSYS2, if you can), open `c1x_launcher.exe`, extract a disc image, play, and build one of the custom levels.
5. On GitHub, open **Releases**, then **Draft a new release**:
   - **Choose a tag**: type `v1.3` and choose to create it, on `master`. The tag has to be the version with a `v` before it: it's what launchers compare their own version with.
   - **Release title**: `Crash 1 Enhanced v1.3`.
   - **Description**: what's changed since the last release, from the [changelog](changelog.md).
   - Attach `release/c1x-1.3.zip`.
   - **Publish release**, as the latest release and not a pre-release: launchers only ask for the latest.

   With the [GitHub CLI](https://cli.github.com/) instead: `gh release create v1.3 release/c1x-1.3.zip --title "Crash 1 Enhanced v1.3" --notes-file notes.md`.

## The launcher's version

`release.bat` sets `C1X_VERSION` to the version for the build, and `make` compiles it into the launcher (`src/launcher/version.c`, built again whenever the version isn't the one it was last built with). `c1x_launcher.exe --version` prints it, which is how the release script checks the launcher it's about to zip. A build made any other way has no version.

When a released launcher opens, it runs `c1x_tools check-update <version>`, which asks GitHub for the repository's latest release and compares that release's tag with the version, as numbers (so 1.10 is newer than 1.9). If the tag is newer, the launcher shows a link to the release's page beside its version (see [Launcher](launcher.md#version)). So players hear of a release once it's published on GitHub with its `v1.3` tag, and not before.

## What's in the zip

The zip has a `c1x-<version>` folder laid out like the repository, as the launcher works on the folder it's in and finds the game in `build/`. Its docs are HTML pages, made from the `.md` files when the release is built, as players may have nothing that shows Markdown: they open in any browser, and the launcher's **Help** tab opens them. Their links to each other go to the pages, and to headings in them as on GitHub.

- `c1x_launcher.exe`, at the top
- `README.html`, from [`doc/release/README.md`](release/README.md): what a player needs to know
- `LICENSE.txt` (`LICENSE`, as a text file a browser shows), `settings.example.cfg` and `controls.example.cfg`
- `build/`: `c1x.exe`, `c1x_tools.exe` and the game's DLLs, and `editor/`, the level editor's built page
- `streams/README.html`: the game's files go there
- `level_src/`: the files git has, so the included custom levels, with its readme as `README.html`
- `assets/`: the files git has, the pictures the game shows that aren't in its files (N-Hanced on the title screen)
- `doc/`: the docs for players, as pages (running, the launcher, controls, settings, custom levels and the changelog)

What isn't in it:

- The game's files (`streams/`) and built levels (`build/levels/`): custom levels are built from the game's own files, so a built level holds them too. Players build the custom levels themselves, in the launcher.
- The acid cave's textures from the game: they're made from the player's own `streams/` when it's built (see its `game_textures.json`).
- The source code, the level editor's included (it's built, in `build/editor/` and `c1x_tools.exe`), the tests and the docs for working on c1x.
- Anything of yours in `build/`, `level_src/` or the settings: only the files listed above go in.

The list is in `tools/level_editor/scripts/release.ts`, and the pages are made by `scripts/htmlDocs.ts`.
