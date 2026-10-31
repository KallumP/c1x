import { useEffect } from "react";

// the browser asks before closing or reloading the page with unsaved changes
export function useUnsavedWarning(unsaved: boolean) {
  useEffect(() => {
    if (!unsaved) {
      return;
    }
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);
}

export const confirmDiscard = (unsaved: boolean) =>
  !unsaved || window.confirm("This level has unsaved changes. Open another and lose them?");
