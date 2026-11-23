import { useEffect, useState } from "react";
import type { LevelInfo } from "../api";
import { imageLogo, viewLogo } from "../levelLogo";
import {
  failureOutcome,
  pictureChoices,
  uploadAfterSaving,
  uploadProblem,
  type PictureChoice,
} from "../levelSharing";
import {
  fetchOwnLevelMod,
  uploadLevel,
  type LevelMod,
  type Uploaded,
} from "../modioApi";
import { errorMessage } from "../errorMessage";

// the editor's view, as a picture for the level, or null if there's no view
function takeViewPicture(): string | null {
  const canvas = document.querySelector<HTMLCanvasElement>(".viewport canvas");
  if (!canvas) {
    return null;
  }
  return viewLogo(canvas);
}

// the open level's picture on mod.io: the one it has, the view as it was when
// the Share dialog opened, or an image file the player chose
function usePicture(online: LevelMod | null | undefined) {
  const [choice, setChoice] = useState<PictureChoice>("view");
  const [viewPicture, setViewPicture] = useState<string | null>(null);
  const [imagePicture, setImagePicture] = useState<string | null>(null);

  useEffect(() => setViewPicture(takeViewPicture()), []);
  // the first choice: keep its picture once it's online, else the view
  useEffect(() => setChoice(pictureChoices(Boolean(online))[0]), [online]);

  // the picture to send: a base64 png, or null to keep the one it has
  const chosen = (): string | null => {
    const pictures: Record<PictureChoice, string | null> = {
      keep: null,
      view: viewPicture,
      image: imagePicture,
    };
    return pictures[choice];
  };

  const chooseImage = async (file: File) => {
    setImagePicture(await imageLogo(file));
    setChoice("image");
  };

  return { choice, setChoice, imagePicture, chosen, chooseImage };
}

// uploading the open level to mod.io once the player's signed in: a new mod, with
// a summary and a picture, or a new version of the one it has
export function useLevelUpload(
  level: LevelInfo,
  signedIn: boolean | null,
  save: () => Promise<boolean>,
  // the player's sign-in was refused, so they have to sign in again
  onSignedOut: () => void,
) {
  // undefined until mod.io says
  const [online, setOnline] = useState<LevelMod | null | undefined>(undefined);
  const [summary, setSummary] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [uploaded, setUploaded] = useState<Uploaded | null>(null);
  const picture = usePicture(online);

  // why a request failed, or back to signing in if it was the sign-in that failed
  const showFailure = (error: unknown) => {
    const outcome = failureOutcome(error);
    if ("signOut" in outcome) {
      onSignedOut();
      return;
    }
    setProblem(outcome.problem);
  };

  useEffect(() => {
    setOnline(undefined);
    setUploaded(null);
    setProblem(null);
    if (!signedIn) {
      return;
    }
    fetchOwnLevelMod(level.name).then(setOnline, showFailure);
  }, [level, signedIn]);

  const sendUpload = async () => {
    const send = () => uploadLevel(level.name, summary.trim(), picture.chosen());
    const done = await uploadAfterSaving(save, send);
    if (!done) {
      setProblem("It didn't save, so it wasn't uploaded.");
      return;
    }
    setUploaded(done);
    setOnline(done.mod);
  };

  const upload = async () => {
    const hasImage = picture.imagePicture !== null;
    const found = uploadProblem(Boolean(online), summary, picture.choice, hasImage);
    setProblem(found);
    if (found || isBusy) {
      return;
    }
    setIsBusy(true);
    setUploaded(null);
    try {
      await sendUpload();
    } catch (error) {
      showFailure(error);
    } finally {
      setIsBusy(false);
    }
  };

  const chooseImage = (file: File) =>
    picture.chooseImage(file).catch((error) => setProblem(errorMessage(error)));
  const { choice, setChoice, chosen } = picture;

  return {
    online,
    summary,
    setSummary,
    problem,
    isBusy,
    uploaded,
    upload,
    picture: { choice, setChoice, chosen },
    chooseImage,
  };
}
