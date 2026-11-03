import { useEffect, useReducer } from "react";
import { fetchObjects, type LevelInfo } from "../api";
import { editorReducer, emptyEditor } from "../editor";
import { parseObjects } from "../objects";

// the open level's objects as they're edited, read from its objects.json when it opens
export function useEditor(level: LevelInfo | null, onError: (message: string) => void) {
  const [state, dispatch] = useReducer(editorReducer, emptyEditor);

  useEffect(() => {
    dispatch({ type: "load", objects: [] }); // so the last level's objects don't show over this one's map
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
        }
      } catch (error) {
        if (isLatestLoad) {
          onError(`objects.json ${error instanceof Error ? error.message : error}`);
        }
      }
    };
    loadObjects();
    return () => {
      isLatestLoad = false;
    };
  }, [level, onError]);

  return { state, dispatch };
}
