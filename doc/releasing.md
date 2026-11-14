# Releasing

A release is a zip players download from the repository's GitHub **Releases** page: the built launcher, game and `build-level.exe`, ready to run on Windows without installing anything (see [What's in the zip](#whats-in-the-zip)).

## Making a release

1. On `master`, pulled, with nothing uncommitted.
2. Pick the version, like `0.1.0`: the first number for big changes, the second for new features, the third for fixes.
3. Build on Windows (see [Building](building.md)), so the launcher, the game and `build-level.exe` match `master`:

   ```
   rebuild.bat
   ```

   `build-level.exe` needs Node.js to make. Check `make` didn't say it skipped it.
4. Make the zip, from `tools/level_editor`:

   ```
   npm run release -- 0.1.0
   ```

   It copies the release's files into `build/release/c1x-0.1.0/` and zips that folder to `build/release/c1x-0.1.0.zip`. If something it needs isn't built, it says what's missing.
5. Try the zip as a player would: unzip it into an empty folder (on a PC without MSYS2, if you can), open `c1x_launcher.exe`, extract a disc image, play, and build one of the custom levels.
6. On GitHub, open **Releases**, then **Draft a new release**:
   - **Choose a tag**: type `v0.1.0` and choose to create it, on `master`.
   - **Release title**: `c1x 0.1.0`.
   - **Description**: what's changed since the last release, from the [changelog](changelog.md).
   - Attach `build/release/c1x-0.1.0.zip`.
   - **Publish release**.

   With the [GitHub CLI](https://cli.github.com/) instead: `gh release create v0.1.0 build/release/c1x-0.1.0.zip --title "c1x 0.1.0" --notes-file notes.md`.

## What's in the zip

The zip has a `c1x-<version>` folder laid out like the repository, as the launcher works on the folder it's in and finds the game in `build/`:

- `c1x_launcher.exe`, at the top
- `README.md`, from [`doc/release/README.md`](release/README.md): what a player needs to know
- `LICENSE`, `settings.example.cfg` and `controls.example.cfg`
- `build/`: `c1x.exe`, `build-level.exe` and the game's DLLs
- `streams/README.md`: the game's files go there
- `level_src/` and `tools/level_editor/`: the files git has, so the included custom levels and the level editor (without its tests or `node_modules`)
- `doc/`: the docs for players (running, the launcher, controls, settings, custom levels and the changelog)

What isn't in it:

- The game's files (`streams/`) and built levels (`build/levels/`): custom levels are built from the game's own files, so a built level holds them too. Players build the custom levels themselves, in the launcher.
- The source code, the tests and the docs for working on c1x.
- Anything of yours in `build/`, `level_src/` or the settings: only the files listed above go in.

The list is in `tools/level_editor/scripts/release.ts`.
