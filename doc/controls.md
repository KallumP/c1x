# Controls

Change the controls in the [launcher](launcher.md#controls)'s Controls tab. The defaults are a WASD layout:

- move - <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd>
- jump (X) - <kbd>Space</kbd>
- spin (square) - <kbd>K</kbd>
- circle - <kbd>;</kbd>
- triangle - <kbd>O</kbd>
- L1 - <kbd>Q</kbd>
- R1 - <kbd>P</kbd>
- L2 - <kbd>E</kbd>
- R2 - <kbd>I</kbd>
- L3 - <kbd>R</kbd>
- R3 - <kbd>U</kbd>
- start - <kbd>J</kbd>
- select - <kbd>F</kbd>
- toggle fullscreen - <kbd>Alt</kbd>+<kbd>Enter</kbd> (it doesn't press start)

Only keyboard input is supported, and only for player 1.

The launcher saves them to `controls.cfg`, next to `streams/`, which the game reads when it starts. Each line binds a button to a key, such as `cross = Space`, and a button with several keys has a line for each. Keys are matched by where they are on the keyboard, so on a non-QWERTY layout `Z` means the key where Z is on a US keyboard.
