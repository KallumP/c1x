import { useEffect, useState } from "react";
import { fetchLevels, type LevelInfo } from "../api";

// the audio files in the open level's folder, looked at again each time the
// editor's window comes back into focus, so one put there while it's open can be picked
export function useLevelSongs(level: LevelInfo | null): string[] {
  const [songs, setSongs] = useState<string[]>([]);

  useEffect(() => {
    if (!level) {
      setSongs([]);
      return;
    }
    setSongs(level.songs);
    const lookAgain = async () => {
      try {
        const found = (await fetchLevels()).find((candidate) => candidate.name === level.name);
        if (found) {
          setSongs(found.songs);
        }
      } catch {
        // the songs already listed stay; only a convenience
      }
    };
    window.addEventListener("focus", lookAgain);
    return () => window.removeEventListener("focus", lookAgain);
  }, [level]);

  return songs;
}
