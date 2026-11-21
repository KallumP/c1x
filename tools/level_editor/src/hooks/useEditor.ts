import { useEffect, useReducer, useState } from "react";
import { fetchObjects, saveObjects, type LevelInfo } from "../api";
import { editorReducer, emptyEditor } from "../editor";
import { formatObjects, parseObjects } from "../objects";

// the open level's objects as they're edited: read from its objects.json when it
// opens, and written back on save. unsaved is whether they differ from the file, and isLoaded whether
// the open level's have been read (or failed to be)
export function useEditor(level: LevelInfo | null, onError: (message: string) => void) {
  const [state, dispatch] = useReducer(editorReducer, emptyEditor);
  const [savedText, setSavedText] = useState(formatObjects([]));
  const [loadedLevel, setLoadedLevel] = useState<LevelInfo | null>(null); // the level whose objects.json has been read
  const text = formatObjects(state.objects);

  useEffect(() => {
    dispatch({ type: "load", objects: [] }); // so the last level's objects don't show over this one's map
    setSavedText(formatObjects([])); // nothing to save until it's read, or changed
    if (!level) {
      return;
    }
    let isLatestLoad = true; // false once the level changes, so a late load is dropped
    const loadObjects = async () => {
      try {
        const fetchedText = await fetchObjects(level.name);
        const parsedObjects = parseObjects(fetchedText);
        if (isLatestLoad) {
          dispatch({ type: "load", objects: parsedObjects });
          setSavedText(formatObjects(parsedObjects));
          setLoadedLevel(level);
        }
      } catch (error) {
        if (isLatestLoad) {
          onError(`objects.json ${error instanceof Error ? error.message : error}`);
          setLoadedLevel(level); // loaded as far as it can be
        }
      }
    };
    loadObjects();
    return () => {
      isLatestLoad = false;
    };
  }, [level, onError]);

  // whether it saved
  const save = async (): Promise<boolean> => {
    if (!level) {
      return false;
    }
    try {
      await saveObjects(level.name, text);
      setSavedText(text);
      return true;
    } catch (error) {
      onError(`couldn't save: ${error instanceof Error ? error.message : error}`);
      return false;
    }
  };

  return { state, dispatch, unsaved: text !== savedText, save, isLoaded: level !== null && loadedLevel === level };
}
