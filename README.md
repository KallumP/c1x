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
- [Structure](doc/structure.md): what each file and directory in the project is for
- [Contributing](doc/contributing.md): commit messages, pull requests and coding standards
- [Releasing](doc/releasing.md): making the zip players download, and publishing it on GitHub

Further documentation, such as the [changelog](doc/changelog.md), known [issues](doc/issues.md) and descriptions of the game's files and functions, is in the [`doc`](doc) directory.

## Licence

c1x's own changes and additions are under the MIT licence; see [LICENSE](LICENSE). It doesn't cover the original c1 port, whose repository gives no licence, so that code is still wurlyfox's and its other contributors'. Crash Bandicoot and its assets belong to their owners, and no game files are included: c1x needs the files from a copy of the game you own. This is an unofficial fan project.
