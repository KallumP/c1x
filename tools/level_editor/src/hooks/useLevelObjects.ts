import { useEffect, useState } from "react";
import { fetchObjects, type LevelInfo } from "../api";
import { parseObjects, type LevelObject } from "../objects";

// a level's objects.json, read when the level opens
export function useLevelObjects(level: LevelInfo, onError: (message: string) => void) {
  const [objects, setObjects] = useState<LevelObject[]>([]);
  useEffect(() => {
    let current = true;
    fetchObjects(level.name)
      .then(parseObjects)
      .then(
        (read) => current && setObjects(read),
        (e) => current && onError(`objects.json ${e instanceof Error ? e.message : e}`),
      );
    return () => { current = false; };
  }, [level, onError]);
  return objects;
}
