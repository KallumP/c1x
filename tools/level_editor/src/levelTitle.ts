// a custom level's title, shown on its loading screen (level.cfg's title, set under Level in the editor):
// the build draws it in a pixel font (builder/pixelFont.ts), so it can only have the characters the font has

export const TITLE_MAX_LENGTH = 30; // as many as fit across the loading screen at the font's smallest size

// the characters the font draws, besides letters and numbers (letters are drawn as capitals)
export const TITLE_PUNCTUATION = " .,'!?-&:";

const isTitleCharacter = (character: string) =>
  /^[A-Za-z0-9]$/.test(character) || TITLE_PUNCTUATION.includes(character);

const capitalised = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

// a level's title when its level.cfg doesn't give one: its folder's name in words,
// without the number in front that orders the levels ("1_tide_ruins" is "Tide Ruins")
export function defaultLevelTitle(folderName: string): string {
  const words = folderName.split("_").filter((word) => word !== "");
  const unnumbered = words.length > 1 && /^\d+$/.test(words[0]) ? words.slice(1) : words;
  return unnumbered.map(capitalised).join(" ");
}

// why a title can't be drawn on the loading screen, or null if it can
export function levelTitleProblem(title: string): string | null {
  if (title.length > TITLE_MAX_LENGTH) {
    return `a title can be at most ${TITLE_MAX_LENGTH} characters, and this is ${title.length}`;
  }
  const unknown = [...title].find((character) => !isTitleCharacter(character));
  if (unknown !== undefined) {
    return `a title can only have letters, numbers, spaces and ${TITLE_PUNCTUATION.trim()}, not ${unknown}`;
  }
  return null;
}
