import { useEffect, useRef } from "react";

export type Shortcuts = Record<string, () => void>;

type KeyPress = Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "shiftKey">;

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement;

const isFunctionKey = (key: string) => /^F\d+$/.test(key);

// a key's name as the shortcuts are written: "Delete", "Escape", "F5", "ctrl+z", "ctrl+shift+z"
function keyName(press: KeyPress): string {
  const key = press.key.length === 1 ? press.key.toLowerCase() : press.key;
  const ctrl = press.ctrlKey || press.metaKey ? "ctrl+" : "";
  const shift = press.shiftKey && press.key.length === 1 ? "shift+" : "";
  return `${ctrl}${shift}${key}`;
}

// the shortcut a key press runs, if any. while typing in a field, keys are left to it,
// except with ctrl held or a function key (which types nothing)
export function shortcutToRun(shortcuts: Shortcuts, press: KeyPress, typing: boolean): (() => void) | undefined {
  const run = shortcuts[keyName(press)];
  if (typing && !press.ctrlKey && !press.metaKey && !isFunctionKey(press.key)) {
    return undefined;
  }
  return run;
}

// keyboard shortcuts, except while typing in a field
export function useShortcuts(shortcuts: Shortcuts) {
  const latestShortcuts = useRef(shortcuts); // so the one listener always runs this render's shortcuts
  latestShortcuts.current = shortcuts;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const run = shortcutToRun(latestShortcuts.current, event, isTyping(event.target));
      if (!run) {
        return;
      }
      event.preventDefault();
      run();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
