// a material's image path (a .mtl's map_Kd), as the level build and the editor
// both read it: Blender writes a whole path, or one going up out of the level's
// folder, for an image that isn't in that folder; then the image is the file
// of the same name in the folder, so copying the images in is all it takes

const isWholePath = (path: string) => /^[a-zA-Z]:[\\/]/.test(path) || /^[\\/]/.test(path);

// whether going through path's folders goes up out of the folder it starts in
function goesUpOut(path: string): boolean {
  let depth = 0;
  for (const part of path.split(/[\\/]/)) {
    if (part === "..") {
      depth--;
    } else if (part !== "." && part !== "") {
      depth++;
    }
    if (depth < 0) {
      return true;
    }
  }
  return false;
}

// whether a map_Kd path leads outside the level's folder
export function isOutsideFolder(path: string): boolean {
  return isWholePath(path) || goesUpOut(path);
}

// a path's file name: what's after its last slash, either way
export function fileNameOf(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1];
}
