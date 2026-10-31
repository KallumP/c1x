import { useEffect, useRef } from "react";

export type Shortcuts = Record<string, () => void>;

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement;

// a key's name as the shortcuts are written: "Delete", "Escape", "ctrl+z", "ctrl+shift+z"
function keyName(event: KeyboardEvent): string {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const ctrl = event.ctrlKey || event.metaKey ? "ctrl+" : "";
  const shift = event.shiftKey && event.key.length === 1 ? "shift+" : "";
  return `${ctrl}${shift}${key}`;
}

// keyboard shortcuts, except while typing in a field
export function useShortcuts(shortcuts: Shortcuts) {
  const latestShortcuts = useRef(shortcuts); // so the one listener always runs this render's shortcuts
  latestShortcuts.current = shortcuts;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const run = latestShortcuts.current[keyName(event)];
      if (!run || (isTyping(event.target) && !event.ctrlKey && !event.metaKey)) {
        return;
      }
      event.preventDefault();
      run();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
