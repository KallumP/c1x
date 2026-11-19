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
- toggle fullscreen - <kbd>Alt</kbd>+<kbd>Enter</kbd> (it doesn't press start) or <kbd>F11</kbd>

## Game controllers

Plug in a game controller (Xbox, PlayStation, Switch Pro and most others) and it plays as player 1 alongside the keyboard, even when plugged in mid-game. By default its buttons are where a PlayStation pad's are:

- move - the d-pad or the left stick
- jump (X) - the bottom face button (A on an Xbox controller)
- spin (square) - the left face button (X)
- circle - the right face button (B)
- triangle - the top face button (Y)
- L1, R1 - the shoulder buttons
- L2, R2 - the triggers
- L3, R3 - clicking the sticks
- start - Start (Menu)
- select - Back (View)

Change them on the launcher's Controls tab, under **Controller**. The launcher names them as on an Xbox controller.

## controls.cfg

The launcher saves them to `controls.cfg`, next to `streams/`, which the game reads when it starts. Each line binds a button to a key, such as `cross = Space`, and a button with several keys has a line for each. Keys are matched by where they are on the keyboard, so on a non-QWERTY layout `Z` means the key where Z is on a US keyboard. A controller button's line starts its name with `pad:`, such as `cross = pad:a` or `r2 = pad:righttrigger`.
