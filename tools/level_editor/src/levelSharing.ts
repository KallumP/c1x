// what the editor says when sharing a level on mod.io
import { errorMessage } from "./errorMessage";
import { isSignedOutError, type Uploaded } from "./modioApi";

export function uploadButtonText(isOnline: boolean): string {
  if (isOnline) {
    return "Upload new version";
  }
  return "Upload";
}

// what an upload says once it's done
export function uploadedText({ isNew }: Uploaded): string {
  if (isNew) {
    return "Upload successful.";
  }
  return "Upload successful, a new version is up.";
}

// what the dialog says of whether the map has been uploaded
export function onlineText(isOnline: boolean): string {
  if (isOnline) {
    return "This map is already online. You can update the map if you've made changes below.";
  }
  return "This map hasn't been uploaded yet.";
}

// what to do about a failed request: sign the player out if it was their sign-in
// that was refused, else say why it failed
export function failureOutcome(error: unknown): { signOut: true } | { problem: string } {
  if (isSignedOutError(error)) {
    return { signOut: true };
  }
  return { problem: errorMessage(error) };
}

// saves the level, then uploads it; what it uploaded, or null if it didn't save
export async function uploadAfterSaving(
  save: () => Promise<boolean>,
  upload: () => Promise<Uploaded>,
): Promise<Uploaded | null> {
  if (!(await save())) {
    return null;
  }
  return upload();
}
