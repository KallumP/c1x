Custom levels
- Bonus levels
- Gem paths
- Custom island with custom levels
- How do animated textures work? Stream levels have animated looking water



Editor
- zone size chooser? Should show error if a zone has too many objects
- invisible walls
- death zones

- the text about the game booting should go away once any changes are detected.
- prisoner hands
- different textuers for moving platforms? Some are the same code, but select what level the textures come from 
    - wall platforms and rotating platforms from slippery climb + sunset vista, 
    - inter map moving platforms, jaws of darkness + castle machinery, fumbling
- outlines dont always show as outlines, there is some weird behaviour in the editor



speed run mode
- Record the time take to complete each level along side which level was played, should be stored in a times folder, like inputs
- The final table should be like this "Level | Total time | Level time"



Generic
- Make included level list better. It shouldnt show the underscores. See if the level files themselves can be updated, if not, change it in the launcher itself. The provided levels should always show at the top
- the new version button should just download the zip file (the file name is deterministic)
- maps should store what version it was built on
- mute-able start
- europe support
- other demo showings dont work, the second one (that shows jungle rollers) opens but no gameplay shows
- the save menu's own text no longer shows up
- the last bonus token you get still rubber bands across the top of the screen
- split up the tools code: tools/level_editor holds both the level editor and c1x_tools (the launcher's level build, update check and mod.io list/download), so move the launcher-only commands out from the editor's code
- Split level editor app.tsx into its own components