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



Update check (launcher version + newer release link)
- test on windows: release.bat 1.5 makes the zip end to end
- test on windows: release.bat 1.3.1 refuses before building (the new findstr check)
- test on windows: the release script gets the version back from c1x_launcher.exe --version
- test on windows: a released launcher shows its version, and the link when a newer release is out
- look at the corner in the launcher: position, wording, the label sits on the heading's line in a smaller font
- the check starts the 85 MB tools exe on every launcher open: cache the answer for a day?
- tests for --version and the Makefile's version stamp, only tested by hand so far
- split the tests that check several outcomes in one (e.g. anything_else_isnt_a_version)
- delete the old build/launcher_version file, it's build/launcher_version.stamp now



Generic
- auto increment the last version in release.bat
- maps should store what version it was built on
- mute-able start
- europe support
- going back to a level shows a white artefact near the middle of the screen, this might be beacuse i rotated the island in the map using circle and square and then entered the level
- other demo showings dont work, the second one (that shows jungle rollers) opens but no gameplay shows
- the save menu's own text no longer shows up
- the last bonus token you get still rubber bands across the top of the screen
