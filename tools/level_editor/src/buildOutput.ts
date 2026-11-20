// what a level build says (builder/buildLevel.ts): warnings, then what it wrote or why it failed

const WARNING = "warning: ";

// the build's warnings, without "warning: "
export function buildWarnings(output: string): string[] {
  return output.split(/\r?\n/)
    .filter((line) => line.startsWith(WARNING))
    .map((line) => line.slice(WARNING.length));
}

// what the editor says after building a level: that it built, and how many warnings it gave
export function builtText(name: string, warnings: string[]): string {
  if (warnings.length === 0) {
    return `Built ${name}`;
  }
  if (warnings.length === 1) {
    return `Built ${name}, with 1 warning`;
  }
  return `Built ${name}, with ${warnings.length} warnings`;
}
