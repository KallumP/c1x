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

// an address the editor asks for one of a level's images by (base, the level's
// files, then the .mtl's path): an image outside the level's folder is the
// folder's file of the same name. other addresses are as they are
export function levelImageUrl(base: string, url: string): string {
  if (!url.startsWith(base)) {
    return url;
  }
  const path = url.slice(base.length);
  if (!isOutsideFolder(path)) {
    return url;
  }
  return base + fileNameOf(path);
}
