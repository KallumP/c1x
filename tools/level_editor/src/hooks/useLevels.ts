import { useEffect, useState } from "react";
import { fetchLevels, type LevelInfo } from "../api";

const LAST_LEVEL = "c1x-level-editor.level";

// the level to open first: ?level=<name> in the address, or the one open last time
function firstLevel(): string | null {
  const asked = new URLSearchParams(location.search).get("level");
  if (asked) return asked;
  try { return localStorage.getItem(LAST_LEVEL); } catch { return null; }
}

function rememberLevel(name: string) {
  try { localStorage.setItem(LAST_LEVEL, name); } catch { /* only a convenience */ }
}

// the level sources, and which is open
export function useLevels(onError: (message: string) => void) {
  const [levels, setLevels] = useState<LevelInfo[]>([]);
  const [level, setLevel] = useState<LevelInfo | null>(null);

  useEffect(() => {
    fetchLevels().then((all) => {
      setLevels(all);
      setLevel(all.find((l) => l.name === firstLevel()) ?? all[0] ?? null);
    }, (e) => onError(String(e)));
  }, [onError]);

  function open(name: string) {
    const picked = levels.find((l) => l.name === name);
    if (!picked) return;
    setLevel(picked);
    rememberLevel(picked.name);
  }

  return { levels, level, open };
}
