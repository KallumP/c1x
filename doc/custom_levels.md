# Custom levels

You can turn a map made in Blender into a level that the game starts from its title screen: **CUSTOM LEVEL**, under **LOAD GAME**. There are three steps:

1. [Make the map in Blender](#1-make-the-map-in-blender)
2. [Place objects in the level editor](#2-place-objects-in-the-level-editor)
3. [Build the level and play it](#3-build-the-level-and-play-it)

Each level gets its own folder in `level_src/`, such as `level_src/1_tide_ruins/`. Some example levels are already there (see [level_src/README.md](../level_src/README.md)). To try one, skip to step 3. To share a level, or play one someone else made, see [Sharing levels](#sharing-levels).

## 1. Make the map in Blender

**Model it:**

- Make the route run towards +Y (away from you in Blender's front view). The camera follows Crash from behind, looking that way. For a side-on level (**view** set to **side**, see below), +Y is right in the game, and the camera watches from Blender's +X side.
- Model at 1 m per Blender unit. Crash is about 1.7 m tall.
- Make faces point to where Crash walks. Turn on the Face Orientation overlay: the side Crash sees should be blue.
- Keep walls upright or leaning away from where Crash walks. A wall that hangs over a floor (leaning in, an overhang or an arch) is only solid up to where it starts to hang, so Crash can walk right through it.
- To make a floor kill Crash (such as water), put it in an object whose name starts with `pit`, such as `pit.001`.
- To stop Crash with an invisible wall (such as along the edge of ground he could walk off), put it in an object whose name starts with `collision`, such as `collision.001`: it's solid but never drawn. Keep it upright, from below the floor to above Crash's reach.
- Keep the map under about 40 m wide and 40 m tall. It can be as long as you like.

**Texture it (optional):**

- Put each image in a Principled BSDF's Base Color. Other shaders, such as Diffuse BSDF, aren't exported.
- If the images are packed in the `.blend`, unpack them with File > External Data > Unpack Resources.
- A face whose UVs are all on its image (0 to 1) keeps them. Otherwise its image repeats every 2.6 m, whatever its UVs.
- To light faces yourself, give the mesh a colour attribute and turn on **Colors** when you export. 128 (0.5) leaves a texture as it is. Without colours, faces are lit by which way they face.

**Export it:**

1. Make a folder for the level in `level_src/`, such as `level_src/my_level/`.
2. Use File > Export > Wavefront (.obj) and save into that folder. Keep the default settings, but turn on **Materials**.
3. Copy the textures you used into the same folder. The build and the level editor find them there, wherever on your PC the `.mtl` says they are.

The folder should now look like this:

```
level_src/my_level/my_level.obj
level_src/my_level/my_level.mtl
level_src/my_level/grass.png
...
```

### Textures from the game

A level can use the game's own textures without sharing them: list them in a `game_textures.json` in the level's folder, instead of copying the images in. The build and the level editor make each one from the game's files in `streams/` when it isn't in the folder, so Blender has it too once the level has been opened or built. The acid cave's (`level_src/4_acid_cave/game_textures.json`) shows the layout: each image's file name, the game's file it's from (such as `s0000004`), the texture page, and where on the page it is. `npm run export-cut-level` writes one for a level it exports.

## 2. Place objects in the level editor

The level editor places Crash's spawn, the level's end, boxes, enemies and obstacles.

**Use it:**

1. In the [launcher](launcher.md#level-editor)'s Level editor tab, click **Open editor**. It opens in your browser.
1. Pick your level at the top left.
1. Pick `spawn`, `end`, `box`, `enemy` or `obstacle` on the left bar, then click the floor to place it. Box, enemy and obstacle place the type you last picked of them, and list their types underneath to pick another. A level needs at least a spawn and an end to be played.
1. Click **Select** (or press Esc), then click an object to select it. Drag it to move it, or change its properties on the right. **Delete** (or Del) removes it.
   The selected object also shows three arrows: red along x, green along y and blue up, as in Blender. Drag an arrow to move the object along that one direction only; the blue one changes its **raise**. With a grid size picked, it snaps to the grid.
1. Click **Save** (or press Ctrl+S), then **Build + boot** at the top right (or press F5), which builds the level and sets it as the one **CUSTOM LEVEL** on the game's title screen starts. [Step 3](#3-build-the-level-and-play-it) has more on building.

Left-drag moves the camera, right-drag turns it, and the scroll wheel zooms. 
Ctrl+Z undoes and Ctrl+Y redoes. 
Ctrl+C copies the selected object, and Ctrl+V pastes a copy of it in the same spot, with the same settings, to drag where you want it. A copy left on top of its original is a warning when the level builds, but it still builds.

A box outlined in red is stuck in a wall or another box (this doesn't stop the level from building), or is an outline whose switch isn't in the level (this does).

Each switch has a number, shown over it. Tick **outline** on a box and pick a switch under it to have that switch fill the box in. A switch can be an outline too: it appears when its switch is hit, and fills in its own outlines only when it's hit itself. A switch can fill in only one other switch. **Drop to floor** puts the selected box just above the floor, and **raise** sets how far off the floor an object should be.

The arrow on the spawn object shows which way the camera faces at the start, and the editor opens a level from behind the spawn, looking that way. With nothing selected, the right side shows the level's settings, saved to its `level.cfg`. Hover a setting's underlined name to see what it does.

- **title** is the name the level's loading screen shows under the game's "LOADING" sign, in the game's own letters, so it can have only letters, spaces and full stops, up to 20 characters. Left empty, it's the folder's name (`1_tide_ruins` shows "Tide Ruins").
- **Your own loading screen:** put a `loading.png` in the level's folder to show it instead of the sign. It's shown at 432 by 144, so a picture that shape fits best; another shape is cut at its edges to fill it. It goes with the level if you share it.
- **turn** and **scale** line the map up with the game (see [If something looks wrong](#if-something-looks-wrong)).
- **Camera** sets how far the camera is from Crash (**distance**, times its usual distance) and how far above him it looks down from (**angle**, in degrees; 42 is usual). **view** is **behind** Crash, or **side** for a side-on level: the camera stays level with him left and right and follows him up and down, but never moves in or out. In a side-on level the spawn's arrow, and enemies' paths you haven't set, turn with the camera; drag an enemy's nodes to send it where you want.
- **Sky** sets a top colour down to **split** and a bottom colour below it.
- **Music** picks the song the level plays, from the game's own levels. A song starred has no aku aku song, so his invincibility keeps the level's song playing.
- **Your own song:** put an `.mp3`, `.ogg`, `.flac` or `.wav` in the level's folder and pick it under **Music**. It plays on a loop, through aku aku's invincibility too, so a song that loops cleanly sounds best. It plays as loud as the game's own music, however loud the file is; turn it up or down with **volume** under the song. It goes with the level if you share it.

**Paths:** an enemy or obstacle that moves along a path is drawn with it, solid where it starts and faded where it ends or turns back. Select it to drag its nodes (or set their x, y and z on the right); a selected node has the same three arrows as an object, to move it along one direction, the blue one lifting it; **nodes** sets how many there are and **Reverse direction** which way it goes first. A path drawn red runs through a wall or off the floor. A few have one handle instead of a path to drag: a bat roost's swoop, leader bats' second leader, and where a lab assistant's vials land.

**Settings:** select anything to see its settings on the right, such as an enemy's **speed** or **count**, or **every** and **offset** to time an obstacle that repeats, so a row can go one after another. **raise** lifts an object over a gap, and a ? box's **drop** makes it give an extra life instead of wumpa. A slippery slope is drawn as the slope it slides Crash down, for you to model in Blender to match.

See [Objects](../level_src/README.md#objects) for how each box, enemy and obstacle behaves.

## 3. Build the level and play it

**Set it up (once):** build the game (see [Building](building.md)), and put its files in `streams/` (see [Running](running.md)). The launcher and the level editor build levels themselves, so there's nothing else to install.

**From the launcher** (no editor needed, as for a level someone sent you: put its folder in `level_src/`): in the **Levels** tab, click **Build** beside the level, or choose it as the **Custom level**, where a level that isn't built yet says `(not built)` and builds when chosen. Once it builds, it's the level the title screen's **CUSTOM LEVEL** starts. Click **Play**, then choose **CUSTOM LEVEL** (under **LOAD GAME**).

**From the level editor:**

1. Click **Build + boot** at the top right (or press **F5**). It saves your changes, builds the level, then, if the build worked, sets it as the game's custom level by writing `boot_level = my_level` in `settings.cfg`. A bar slides along the bottom of the top bar while it works, and it says `CUSTOM LEVEL on the game's title screen starts my_level` when it's done, or why it failed (hover over the message for the full output).
2. In the launcher, click **Play**, then choose **CUSTOM LEVEL** on the title screen (under **LOAD GAME**). When the level ends, the game is back at the title screen.

**Build** (or Ctrl+Shift+B) on its own saves and builds the level without changing which level **CUSTOM LEVEL** starts. Hovering over a button shows its shortcut.

**After any change** to the map or objects, build again. You don't need to rebuild the game.

**To take CUSTOM LEVEL off the title screen**, choose **none** as the launcher's **Custom level**. It stays there, starting the level, until you do, even after you close the editor.

### If something looks wrong

- **Crash faces sideways or backwards:** the route doesn't run along +Y. With nothing selected in the editor, set **turn** under **Level** so the arrow at the spawn points along the route, then build again.
- **Crash looks too big or too small:** set **scale** under **Level** to a different number (400 is normal; bigger makes the map bigger), then build again.
- **Faces have the wrong textures:** the build warned that an image wasn't found, or isn't in the level's folder (hover over the build message to see it). Copy that image into the level's folder.
- **Parts of the map are missing:** the faces point the wrong way. Flip them in Blender.
- **The build says a level couldn't be read, and an enemy comes from it:** some enemies are taken from the game's own levels, such as the crab from N. Sanity Beach. Extract all the game's files into `streams/` (see [Running](running.md)).
- **The build says an image is from one of the game's files that isn't in `streams/`:** the level uses textures from the game (see [Textures from the game](#textures-from-the-game)). Extract all the game's files into `streams/`.
- **The build says there are more texture pages than the game holds:** each image on the map and each kind of enemy from another level takes room for textures. Use fewer images or fewer kinds of enemy.

## Sharing levels

Levels are shared on [c1x's page on mod.io](https://mod.io/g/crash-1-n-hanced), each as a zip of its folder.

**Share yours from the level editor:**

1. Open the level and line the view up: the view when you click **Share** is the level's picture on mod.io.
2. Click **Share** in the top left corner.
3. Sign in to mod.io with your email. It emails you a code to sign in with.
4. Click **Upload**.

Once it's up, **Share** uploads a new version of it, keeping its picture.

**Play someone else's from the launcher:**

1. Open the **Levels** tab: **Online levels** lists the most downloaded. To search for one, type part of its name and click **Find levels**.
2. Click **Download** beside the one you want. It goes in `level_src/` and builds.
3. Choose it as the **Custom level**.

A level you made yourself is never replaced: if one has the same folder name, rename yours first.
