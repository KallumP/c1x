# Releasing

A release is a zip players download from the repository's GitHub **Releases** page: the built launcher, game and tools (the level build and level editor, `c1x_tools.exe`), ready to run on Windows without installing anything (see [What's in the zip](#whats-in-the-zip)).

## Making a release

1. On `master`, pulled, with nothing uncommitted.
2. Pick the version, like `0.1.0`: the first number for big changes, the second for new features, the third for fixes.
3. On Windows, run `release.bat` from the project folder with the version, or double-click it and type the version when it asks:

   ```
   release.bat 0.1.0
   ```

   It builds everything first with `rebuild.bat` (see [Building](building.md)), so the launcher, the game, `c1x_tools.exe` and the level editor's page match `master`; it needs MSYS2 and Node.js (players don't). Then it copies the release's files into `release/c1x-0.1.0/` (in the project folder, beside `release.bat`) and zips that folder to `release/c1x-0.1.0.zip`. If the build fails, or something the release needs isn't there, it says so and makes no zip.

   To make the zip without building, run `npm run release -- 0.1.0` in `tools/level_editor`.
4. Try the zip as a player would: unzip it into an empty folder (on a PC without MSYS2, if you can), open `c1x_launcher.exe`, extract a disc image, play, and build one of the custom levels.
5. On GitHub, open **Releases**, then **Draft a new release**:
   - **Choose a tag**: type `v0.1.0` and choose to create it, on `master`.
   - **Release title**: `c1x 0.1.0`.
   - **Description**: what's changed since the last release, from the [changelog](changelog.md).
   - Attach `release/c1x-0.1.0.zip`.
   - **Publish release**.

   With the [GitHub CLI](https://cli.github.com/) instead: `gh release create v0.1.0 release/c1x-0.1.0.zip --title "c1x 0.1.0" --notes-file notes.md`.

## What's in the zip

The zip has a `c1x-<version>` folder laid out like the repository, as the launcher works on the folder it's in and finds the game in `build/`. Its docs are HTML pages, made from the `.md` files when the release is built, as players may have nothing that shows Markdown: they open in any browser, and the launcher's **Help** tab opens them. Their links to each other go to the pages, and to headings in them as on GitHub.

- `c1x_launcher.exe`, at the top
- `README.html`, from [`doc/release/README.md`](release/README.md): what a player needs to know
- `LICENSE.txt` (`LICENSE`, as a text file a browser shows), `settings.example.cfg` and `controls.example.cfg`
- `build/`: `c1x.exe`, `c1x_tools.exe` and the game's DLLs, and `editor/`, the level editor's built page
- `streams/README.html`: the game's files go there
- `level_src/`: the files git has, so the included custom levels, with its readme as `README.html`
- `doc/`: the docs for players, as pages (running, the launcher, controls, settings, custom levels and the changelog)

What isn't in it:

- The game's files (`streams/`) and built levels (`build/levels/`): custom levels are built from the game's own files, so a built level holds them too. Players build the custom levels themselves, in the launcher.
- The acid cave's textures from the game: they're made from the player's own `streams/` when it's built (see its `game_textures.json`).
- The source code, the level editor's included (it's built, in `build/editor/` and `c1x_tools.exe`), the tests and the docs for working on c1x.
- Anything of yours in `build/`, `level_src/` or the settings: only the files listed above go in.

The list is in `tools/level_editor/scripts/release.ts`, and the pages are made by `scripts/htmlDocs.ts`.
