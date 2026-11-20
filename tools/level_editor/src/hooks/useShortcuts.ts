import { useEffect, useRef } from "react";

export type Shortcuts = Record<string, () => void>;

type KeyPress = Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "shiftKey">;

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement;

const isFunctionKey = (key: string) => /^F\d+$/.test(key);

// keys a field being typed in keeps, ctrl or not: copying and pasting its text
const FIELD_KEYS = new Set(["ctrl+c", "ctrl+v"]);

// a key's name as the shortcuts are written: "Delete", "Escape", "F5", "ctrl+z", "ctrl+shift+z"
function keyName(press: KeyPress): string {
  const key = press.key.length === 1 ? press.key.toLowerCase() : press.key;
  const ctrl = press.ctrlKey || press.metaKey ? "ctrl+" : "";
  const shift = press.shiftKey && press.key.length === 1 ? "shift+" : "";
  return `${ctrl}${shift}${key}`;
}

// whether a key press is left to a field being typed in: all but ctrl keys and
// function keys (which type nothing), and copying and pasting with ctrl too
function isLeftToField(press: KeyPress): boolean {
  if (FIELD_KEYS.has(keyName(press))) {
    return true;
  }
  return !press.ctrlKey && !press.metaKey && !isFunctionKey(press.key);
}

// the shortcut a key press runs, if any
export function shortcutToRun(shortcuts: Shortcuts, press: KeyPress, typing: boolean): (() => void) | undefined {
  if (typing && isLeftToField(press)) {
    return undefined;
  }
  return shortcuts[keyName(press)];
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
