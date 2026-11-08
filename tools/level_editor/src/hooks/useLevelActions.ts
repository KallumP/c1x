import { useEffect, useState } from "react";
import { bootLevel, buildLevel, type LevelInfo } from "../api";

export interface ActionStatus {
  text: string;
  detail?: string; // the build's whole output, shown on hover
  failed?: boolean;
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));
const lastLine = (output: string) => output.trim().split(/\r?\n/).pop() ?? "";

// building the open level, and setting the game to boot into it (or both, F5)
export function useLevelActions(level: LevelInfo | null, unsaved: boolean, save: () => Promise<boolean>) {
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState<ActionStatus | null>(null);
  useEffect(() => setStatus(null), [level]);

  // saves first, as the build reads objects.json; whether it saved
  const saveFirst = async (): Promise<boolean> => {
    if (!unsaved) {
      return true;
    }
    setStatus({ text: "Saving..." });
    if (await save()) {
      return true;
    }
    setStatus({ text: "Save failed, so it wasn't built", failed: true });
    return false;
  };

  // true if it built; busy (and saying so) from saving until the build is done
  const build = async (): Promise<boolean> => {
    if (!level || isBusy) {
      return false;
    }
    setIsBusy(true);
    try {
      if (!(await saveFirst())) {
        return false;
      }
      setStatus({ text: `Building ${level.name}...` });
      const result = await buildLevel(level.name);
      if (result.ok) {
        setStatus({ text: `Built ${level.name}`, detail: result.output });
      } else {
        setStatus({ text: `Build failed: ${lastLine(result.output)}`, detail: result.output, failed: true });
      }
      return result.ok;
    } catch (error) {
      setStatus({ text: `Build failed: ${messageOf(error)}`, failed: true });
      return false;
    } finally {
      setIsBusy(false);
    }
  };

  const boot = async () => {
    if (!level) {
      return;
    }
    setStatus({ text: "Setting the game to boot into it..." });
    try {
      await bootLevel(level.name);
      setStatus({ text: `The game boots into ${level.name}` });
    } catch (error) {
      setStatus({ text: `Couldn't set boot_level: ${messageOf(error)}`, failed: true });
    }
  };

  // boots only if the build worked
  const buildAndBoot = async () => {
    if (await build()) {
      await boot();
    }
  };

  return { isBusy, status, build, buildAndBoot };
}
