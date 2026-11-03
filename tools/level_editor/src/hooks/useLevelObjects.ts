import { useEffect, useState } from "react";
import { fetchObjects, type LevelInfo } from "../api";
import { parseObjects, type LevelObject } from "../objects";

// a level's objects.json, read when the level opens (none with no level, or until it's read)
export function useLevelObjects(level: LevelInfo | null, onError: (message: string) => void) {
  const [objects, setObjects] = useState<LevelObject[]>([]);
  useEffect(() => {
    setObjects([]); // so the last level's objects don't show over this one's map
    if (!level) {
      return;
    }
    let isLatestLoad = true; // false once the level changes, so a late load is dropped
    const loadObjects = async () => {
      try {
        const fetchedText = await fetchObjects(level.name);
        const parsedObjects = parseObjects(fetchedText);
        if (isLatestLoad) {
          setObjects(parsedObjects);
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
  return objects;
}
