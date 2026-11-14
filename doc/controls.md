# Controls

Change the controls in the [launcher](launcher.md#controls)'s Controls tab. The defaults are a WASD layout:

- move - <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd>, or the arrow keys
- jump (X) - <kbd>Space</kbd>
- spin (square) - <kbd>Left Shift</kbd>
- circle - <kbd>C</kbd>
- triangle - <kbd>F</kbd>
- L1 - <kbd>Z</kbd>
- R1 - <kbd>X</kbd>
- L2 - <kbd>Q</kbd>
- R2 - <kbd>E</kbd>
- L3 - <kbd>1</kbd>
- R3 - <kbd>3</kbd>
- start - <kbd>Enter</kbd>
- select - <kbd>Backspace</kbd>
- toggle in-game GUI - <kbd>Esc</kbd>
- toggle in-game GUI keyboard focus - <kbd>Tab</kbd>
- toggle fullscreen - <kbd>Alt</kbd>+<kbd>Enter</kbd> (it doesn't press start)

Only keyboard input is supported, and only for player 1.

The launcher saves them to `controls.cfg`, next to `streams/`, which the game reads when it starts. Each line binds a button to a key, such as `cross = Space`, and a button with several keys has a line for each. Keys are matched by where they are on the keyboard, so on a non-QWERTY layout `Z` means the key where Z is on a US keyboard.
