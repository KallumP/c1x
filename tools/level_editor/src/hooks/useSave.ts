import { useState } from "react";

// a part of the level that's saved to its own file: its objects, or its level.cfg
export interface Savable {
  unsaved: boolean;
  save: () => Promise<boolean>;
}

// saves the parts that changed, in order, stopping at one that fails; whether
// they all saved
export async function saveChanged(parts: Savable[]): Promise<boolean> {
  for (const part of parts) {
    if (part.unsaved && !(await part.save())) {
      return false;
    }
  }
  return true;
}

export function saveButtonText(isSaving: boolean, unsaved: boolean): string {
  if (isSaving) {
    return "Saving...";
  }
  if (unsaved) {
    return "Save";
  }
  return "Saved";
}

// saving the level's objects, then its level.cfg, whichever changed
export function useSave(objects: Savable, levelCfg: Savable) {
  const [isSaving, setIsSaving] = useState(false);
  const save = async (): Promise<boolean> => {
    setIsSaving(true);
    try {
      return await saveChanged([objects, levelCfg]);
    } finally {
      setIsSaving(false);
    }
  };
  return { save, isSaving };
}
