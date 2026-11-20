import { useEffect, useState } from "react";
import { bootLevel, buildLevel, type LevelInfo } from "../api";
import { buildWarnings, builtText } from "../buildOutput";

export interface ActionStatus {
  text: string;
  detail?: string; // the build's whole output, shown on hover
  failed?: boolean;
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));
const lastLine = (output: string) => output.trim().split(/\r?\n/).pop() ?? "";

// building the open level, and setting it as the game's custom level (or both, F5)
export function useLevelActions(level: LevelInfo | null, unsaved: boolean, save: () => Promise<boolean>) {
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState<ActionStatus | null>(null);
  // the last build's warnings, kept apart from the status so booting after it doesn't hide them
  const [warnings, setWarnings] = useState<string[]>([]);
  useEffect(() => {
    setStatus(null);
    setWarnings([]);
  }, [level]);

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
      setWarnings([]);
      const result = await buildLevel(level.name);
      if (result.ok) {
        const builtWarnings = buildWarnings(result.output);
        setWarnings(builtWarnings);
        setStatus({ text: builtText(level.name, builtWarnings), detail: result.output });
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

  // busy (and saying so) until boot_level is set: the level the title screen's CUSTOM LEVEL starts
  const boot = async () => {
    if (!level) {
      return;
    }
    setIsBusy(true);
    setStatus({ text: "Setting it as the game's custom level..." });
    try {
      await bootLevel(level.name);
      setStatus({ text: `CUSTOM LEVEL on the game's title screen starts ${level.name}` });
    } catch (error) {
      setStatus({ text: `Couldn't set boot_level: ${messageOf(error)}`, failed: true });
    } finally {
      setIsBusy(false);
    }
  };

  // boots only if the build worked
  const buildAndBoot = async () => {
    if (await build()) {
      await boot();
    }
  };

  return { isBusy, status, warnings, build, buildAndBoot };
}
