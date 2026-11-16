# c1x

c1x ("c1, extended") is a port of the game *Crash Bandicoot* to C, upgraded with quality of life improvements and packed with new features, such as custom levels built in Blender.

The code was originally designed to compile for both psx and pc. As of 30 October 2026, this fork no longer supports building for the PS1 and only builds for pc; see [PS1 build](doc/psx-build.md) for why.

This repository is a fork of [wurlyfox/c1](https://github.com/wurlyfox/c1), the original port by wurlyfox (with contributions from others, such as ManDude). The port itself, and the reverse engineering behind it, is their work. The original repo has not been touched since 2024, so c1x can act as its successor. The game is built as `c1x`, with a launcher, `c1x_launcher`, to start it.

## Documentation

- [Building](doc/building.md): dependencies, compiling on Linux and Windows, and running the tests
- [PS1 build](doc/psx-build.md): why building for the PS1 is no longer supported, and what bringing it back would take
- [Running](doc/running.md): getting the game files from your disc or a disc image, and starting the game
- [Launcher](doc/launcher.md): a window, built with the game, for starting it, changing its settings and controls, and opening the level editor
- [Controls](doc/controls.md): the default keys, and changing them in the launcher
- [Settings](doc/settings.md): what each game setting does, such as the loading screen, speed display and skipping the splash screens
- [Custom levels](doc/custom_levels.md): turning a map modelled in Blender into a level, placing its objects in the level editor, and booting into it
- [Contributing](doc/contributing.md): commit messages, pull requests and coding standards
- [Releasing](doc/releasing.md): making the zip players download, and publishing it on GitHub

Further documentation, such as the [changelog](doc/changelog.md), known [issues](doc/issues.md) and descriptions of the game's files and functions, is in the [`doc`](doc) directory.

## Project layout

- `src/`: the game, in C (wurlyfox's port, and c1x's additions in `src/pc/`; see [where code goes](doc/coding.md#where-code-goes)), and the launcher, in `src/launcher/`
- `tools/level_editor/`: the level editor and the level build, in TypeScript, which `make` packs into `build/c1x_tools.exe`
- `tests/`: the game's and the launcher's unit tests (`make test`); the level editor's are in `tools/level_editor/tests/`
- `level_src/`: custom level sources, a folder each; the ones made for c1x are listed in [`level_src/README.md`](level_src/README.md)
- `streams/`: the game's files, from your own copy (not in the repository)
- `build/`: what `make` builds: the game, the tools and the custom levels (not in the repository)
- `assets/`: pictures the game shows that aren't in its files, such as N-Hanced on the title screen
- `res/`: the game's and the launcher's icons
- `doc/`: the documentation
- `rebuild.bat` and `release.bat`: building on Windows, and making the release zip

## Licence

c1x's own changes and additions are under the MIT licence; see [LICENSE](LICENSE). It doesn't cover the original c1 port, whose repository gives no licence, so that code is still wurlyfox's and its other contributors'. Crash Bandicoot and its assets belong to their owners, and no game files are included: c1x needs the files from a copy of the game you own. This is an unofficial fan project.
