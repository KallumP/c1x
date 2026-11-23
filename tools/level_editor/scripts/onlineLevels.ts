// c1x_tools list-online-levels: the levels players have shared on mod.io, one
// line each for the launcher's Levels tab to read

import { isProblem, listOnlineLevels, type Answer, type OnlineLevel } from "./modio";

// what's said before each level's line, which the launcher looks for.
// online_levels.c has the same text, and a test checks the two are the same
export const ONLINE_LEVEL_PREFIX = "online level: ";

// text with its tabs and line ends made spaces, so it fits between a line's tabs
const oneLine = (text: string) => text.replace(/[\t\r\n]/g, " ");

// the prefix, then the level's id, author, name and page, with tabs between
export function onlineLevelLine({ id, author, name, page }: OnlineLevel): string {
  const fields = [id, oneLine(author), oneLine(name), oneLine(page)];
  return `${ONLINE_LEVEL_PREFIX}${fields.join("\t")}`;
}

// says each online level's line, or that there are none, or why it can't tell;
// returns the exit code, 1 when it can't tell. list is a test's stand-in
export async function listOnlineLevelsCommand(
  say: (line: string) => void,
  list: () => Promise<Answer<OnlineLevel[]>> = listOnlineLevels,
): Promise<number> {
  const levels = await list();
  if (isProblem(levels)) {
    say(`couldn't list the levels on mod.io: ${levels.problem}`);
    return 1;
  }
  if (levels.length === 0) {
    say("no levels are on mod.io yet");
  }
  levels.forEach((level) => say(onlineLevelLine(level)));
  return 0;
}
