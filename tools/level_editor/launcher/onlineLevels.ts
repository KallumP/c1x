// c1x_tools list-online-levels [name]: the top levels players have shared on
// mod.io, or those with name in theirs, one line each for the launcher's Levels
// tab to read

import { isProblem, type Answer } from "../scripts/answer";
import { listOnlineLevels, type OnlineLevel } from "../scripts/modio";

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

function noLevelsLine(name: string): string {
  if (!name) {
    return "no levels are on mod.io yet";
  }
  return `no levels on mod.io have "${name}" in their name`;
}

// says the line of each top level on mod.io, or each with name in theirs, or that
// there are none, or why it can't tell; returns the exit code, 1 when it can't
// tell. list is a test's stand-in
export async function listOnlineLevelsCommand(
  name: string,
  say: (line: string) => void,
  list: (name: string) => Promise<Answer<OnlineLevel[]>> = listOnlineLevels,
): Promise<number> {
  const levels = await list(name);
  if (isProblem(levels)) {
    say(`couldn't list the levels on mod.io: ${levels.problem}`);
    return 1;
  }
  if (levels.length === 0) {
    say(noLevelsLine(name));
  }
  levels.forEach((level) => say(onlineLevelLine(level)));
  return 0;
}
