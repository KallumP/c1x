import { useEffect, useState } from "react";

// whether shift is held down, cleared when the window loses focus
export function useShiftHeld(): boolean {
  const [held, setHeld] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => setHeld(e.shiftKey);
    const onBlur = () => setHeld(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return held;
}
