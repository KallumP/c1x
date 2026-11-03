# Custom levels

You can turn a map made in Blender into a level that the game boots straight into. There are three steps:

1. [Make the map in Blender](#1-make-the-map-in-blender)
2. [Place objects in the level editor](#2-place-objects-in-the-level-editor)
3. [Build the level and play it](#3-build-the-level-and-play-it)

Each level gets its own folder in `level_src/`, such as `level_src/tide_ruins/`. Some example levels are already there (see [level_src/README.md](../level_src/README.md)). To try one, skip to step 3.

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
- UVs aren't used: each image repeats every 2.6 m.

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

The level editor places Crash's start, the end of the level, and boxes.

**Set it up (once):** install [Node.js](https://nodejs.org/) 18 or later, then run:

```
cd tools/level_editor
npm install
```

**Use it:**

1. From `tools/level_editor/`, run `npm run dev`. It opens in your browser at `http://localhost:5173/`.
2. Pick your level at the top left.
3. Pick `spawn`, `end` or a box on the left, then click the floor to place it.
4. Click **Select** (or press Escape), then click an object to select it. Drag it to move it, or change it on the right. Delete removes it.
5. Click **Save** (or press Ctrl+S).

Ctrl+Z undoes and Ctrl+Y redoes. A box outlined in red is stuck in a wall or another box, so move it. **Drop to floor** on the right puts the selected box just above the floor below it.

With nothing selected, the right side shows the **Level**'s turn and scale (see [If something looks wrong](#if-something-looks-wrong)). Save writes them to the level's `level.cfg`, along with the objects. Changing the scale changes how big the boxes look on the map, as they stay the same size in the game.

When you're done, build and play the level from the editor too (see step 3).

## 3. Build the level and play it

**Set it up (once):** build the game (see [Building](building.md)), put its files in `streams/` (see [Running](running.md)), and install Python 3 and Pillow:

```
pip install pillow
```

Then, in the level editor:

1. Click **Build** at the top right. It saves your changes, then builds the level. It says `Built my_level` when it's done, or why it failed (hover over the message for the full output).
2. Click **Boot**. It sets the game to start in this level, by writing `boot_level = my_level` in `settings.cfg`.
3. Run `build/c1.exe`.

Or press **F5**, which does steps 1 and 2 together: it saves, builds, then sets the game to boot into the level if the build worked.

**After any change** to the map or objects, build again. You don't need to rebuild the game.

**To stop booting into the level** and start at the title screen again, remove the `boot_level` line from `settings.cfg`, or put a `#` in front of it. The game keeps booting into the level until you do, even after you close the editor.

### If something looks wrong

- **Crash faces sideways or backwards:** the route doesn't run along +Y. With nothing selected in the editor, set **turn** under **Level** to 90 (or 270), then build again.
- **Crash looks too big or too small:** set **scale** under **Level** to a different number (400 is normal; bigger makes the map bigger), then build again.
- **Faces have the wrong textures:** the build warned that an image wasn't found (hover over the build message to see it). Check the `map_Kd` lines in the `.mtl`.
- **Parts of the map are missing:** the faces point the wrong way. Flip them in Blender.
