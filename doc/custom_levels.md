# Custom levels

You can turn a map made in Blender into a level that the game boots straight into. There are three steps:

1. [Make the map in Blender](#1-make-the-map-in-blender)
2. [Place objects in the level editor](#2-place-objects-in-the-level-editor)
3. [Build the level and play it](#3-build-the-level-and-play-it)

Each level gets its own folder in `level_src/`, such as `level_src/1_tide_ruins/`. Some example levels are already there (see [level_src/README.md](../level_src/README.md)). To try one, skip to step 3.

## 1. Make the map in Blender

**Model it:**

- Make the route run towards +Y (away from you in Blender's front view). The camera follows Crash from behind, looking that way.
- Model at 1 m per Blender unit. Crash is about 1.7 m tall.
- Make faces point to where Crash walks. Turn on the Face Orientation overlay: the side Crash sees should be blue.
- To make a floor kill Crash (such as water), put it in an object whose name starts with `pit`, such as `pit.001`.
- Keep the map under about 40 m wide and 40 m tall. It can be as long as you like.

**Texture it (optional):**

- Put each image in a Principled BSDF's Base Color. Other shaders, such as Diffuse BSDF, aren't exported.
- If the images are packed in the `.blend`, unpack them with File > External Data > Unpack Resources.
- A face whose UVs are all on its image (0 to 1) keeps them. Otherwise its image repeats every 2.6 m, whatever its UVs.
- To light faces yourself, give the mesh a colour attribute and turn on **Colors** when you export. 128 (0.5) leaves a texture as it is. Without colours, faces are lit by which way they face.

**Export it:**

1. Make a folder for the level in `level_src/`, such as `level_src/my_level/`.
2. Use File > Export > Wavefront (.obj) and save into that folder. Keep the default settings, but turn on **Materials**.
3. Copy the images into the same folder.
4. Open the `.mtl` file in a text editor. Change each `map_Kd` line so it has just the image's file name, such as `map_Kd grass.png`.

The folder should now look like this:

```
level_src/my_level/my_level.obj
level_src/my_level/my_level.mtl
level_src/my_level/grass.png
...
```

## 2. Place objects in the level editor

The level editor places Crash's spawn, the level's end, boxes, enemies and obstacles.

**Set it up (once):** install [Node.js](https://nodejs.org/) 18 or later, then click **Install** in the [launcher](launcher.md#level-editor)'s Level editor section.

**Use it:**

1. In the launcher, click **Open editor**. It opens in your browser.
1. Pick your level at the top left.
1. Pick `spawn`, `end`, `box`, `enemy` or `obstacle` on the left bar, then click the floor to place it. Box, enemy and obstacle place the type you last picked of them, and list their types underneath to pick another. A level needs at least a spawn and an end to be played.
1. Click **Select** (or press Esc), then click an object to select it. Drag it to move it, or change its properties on the right. **Delete** (or Del) removes it.
1. Click **Save** (or press Ctrl+S), then **Build + boot** at the top right (or press F5), which builds the level and boots the game straight into it. [Step 3](#3-build-the-level-and-play-it) has more on building.

Left-drag moves the camera, right-drag turns it, and the scroll wheel zooms. 
Ctrl+Z undoes and Ctrl+Y redoes. 

A box outlined in red is stuck in a wall or another box (this doesn't stop the level from building). **Drop to floor** puts the selected box just above the floor, and **raise** sets how far off the floor an object should be.

The arrow on the spawn object shows which way the camera faces at the start. With nothing selected, the right side shows the level's settings, saved to its `level.cfg`:

- **turn** and **scale** line the map up with the game (see [If something looks wrong](#if-something-looks-wrong)).
- **Sky** sets a top colour down to **split** and a bottom colour below it.
- **Camera** sets how far the camera is from Crash (**distance**, times its usual distance) and how far above him it looks down from (**angle**, in degrees; 42 is usual).
- **Music** picks the song the level plays, from the game's own levels. A song starred has no aku aku song, so his invincibility keeps the level's song playing.
- **Your own song:** put a `music.mid` in the level's folder and it plays instead. Add a `music_aku.mid` for aku aku's song, and a `music.sf2` (a SoundFont) for its instruments. Without a `music.sf2`, the song plays on the instruments of the song picked under **Music**, by the program numbers in your `.mid`. A full General MIDI SoundFont can be tens of megabytes, and it goes with the level if you share it.

**Paths:** an enemy or obstacle that moves along a path is drawn with it, solid where it starts and faded where it ends or turns back. Select it to drag its nodes (or set their x, y and z on the right); **nodes** sets how many there are and **Reverse direction** which way it goes first. A path drawn red runs through a wall or off the floor. A few have one handle instead of a path to drag: a bat roost's swoop, leader bats' second leader, and where a lab assistant's vials land.

**Settings:** select anything to see its settings on the right, such as an enemy's **speed** or **count**, or **every** and **offset** to time an obstacle that repeats, so a row can go one after another. **raise** lifts an object over a gap. A slippery slope is drawn as the slope it slides Crash down, for you to model in Blender to match.

See [Objects](../level_src/README.md#objects) for how each box, enemy and obstacle behaves.

## 3. Build the level and play it

**Set it up (once):** build the game (see [Building](building.md)), and put its files in `streams/` (see [Running](running.md)). The launcher and the level editor build levels themselves, so there's nothing else to install.

**From the launcher** (no editor needed, as for a level someone sent you: put its folder in `level_src/`): in the **Levels** tab, click **Build** beside the level, or choose it as the **Boot level**, where a level that isn't built yet says `(not built)` and builds when chosen. Once it builds, the game boots into it. Click **Play**.

**From the level editor:**

1. Click **Build + boot** at the top right (or press **F5**). It saves your changes, builds the level, then, if the build worked, sets the game to start in it by writing `boot_level = my_level` in `settings.cfg`. A bar slides along the bottom of the top bar while it works, and it says `The game boots into my_level` when it's done, or why it failed (hover over the message for the full output).
2. In the launcher, click **Play**.

**Build** (or Ctrl+Shift+B) on its own saves and builds the level without changing which level the game boots into. Hovering over a button shows its shortcut.

**After any change** to the map or objects, build again. You don't need to rebuild the game.

**To stop booting into the level** and start at the title screen again, choose **title screen** as the launcher's **Boot level**. The game keeps booting into the level until you do, even after you close the editor.

### If something looks wrong

- **Crash faces sideways or backwards:** the route doesn't run along +Y. With nothing selected in the editor, set **turn** under **Level** so the arrow at the spawn points along the route, then build again.
- **Crash looks too big or too small:** set **scale** under **Level** to a different number (400 is normal; bigger makes the map bigger), then build again.
- **Faces have the wrong textures:** the build warned that an image wasn't found (hover over the build message to see it). Check the `map_Kd` lines in the `.mtl`.
- **Parts of the map are missing:** the faces point the wrong way. Flip them in Blender.
- **The build says a level couldn't be read, and an enemy comes from it:** some enemies are taken from the game's own levels, such as the crab from N. Sanity Beach. Extract all the game's files into `streams/` (see [Running](running.md)).
- **The build says there are more texture pages than the game holds:** each image on the map and each kind of enemy from another level takes room for textures. Use fewer images or fewer kinds of enemy.
