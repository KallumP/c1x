import { useEffect, useState } from "react";
import type { LevelInfo } from "../api";
import { imageLogo, viewLogo } from "../levelLogo";
import { firstPictureChoice, pictureProblem, summaryProblem, type PictureChoice } from "../levelSharing";
import { fetchOnlineLevel, uploadLevel, type LevelMod, type Uploaded } from "../modioApi";

function messageOf(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

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
  useEffect(() => setChoice(firstPictureChoice(Boolean(online))), [online]);

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

  return { choice, setChoice, viewPicture, imagePicture, chooseImage, chosen };
}

// uploading the open level to mod.io once the player's signed in: a new mod, with
// a summary and a picture, or a new version of the one it has
export function useLevelUpload(
  level: LevelInfo | null,
  signedIn: boolean | null,
  save: () => Promise<boolean>,
) {
  const [online, setOnline] = useState<LevelMod | null | undefined>(undefined); // undefined until mod.io says
  const [summary, setSummary] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [uploaded, setUploaded] = useState<Uploaded | null>(null);
  const picture = usePicture(online);

  useEffect(() => {
    setOnline(undefined);
    setUploaded(null);
    setProblem(null);
    if (!level || !signedIn) {
      return;
    }
    fetchOnlineLevel(level.name).then(setOnline, (error) => setProblem(messageOf(error)));
  }, [level, signedIn]);

  // a new level needs a summary; a new version keeps its mod's. either needs its picture
  const typedProblem = () => {
    if (!online) {
      const summaryFault = summaryProblem(summary);
      if (summaryFault) {
        return summaryFault;
      }
    }
    return pictureProblem(picture.choice, picture.imagePicture !== null);
  };

  const sendUpload = async (name: string) => {
    if (!(await save())) {
      setProblem("It didn't save, so it wasn't uploaded.");
      return;
    }
    const done = await uploadLevel(name, summary.trim(), picture.chosen());
    setUploaded(done);
    setOnline(done.mod);
  };

  const upload = async () => {
    const found = typedProblem();
    setProblem(found);
    if (!level || found || isBusy) {
      return;
    }
    setIsBusy(true);
    setUploaded(null);
    try {
      await sendUpload(level.name);
    } catch (error) {
      setProblem(messageOf(error));
    } finally {
      setIsBusy(false);
    }
  };

  const chooseImage = (file: File) => picture.chooseImage(file).catch((error) => setProblem(messageOf(error)));

  return { online, summary, setSummary, problem, isBusy, uploaded, upload, picture, chooseImage };
}
