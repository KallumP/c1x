// npm run next-version: prints the version the next release gets, one more
// than the latest release tag's (see doc/releasing.md). release.bat suggests it
import { fileURLToPath } from "node:url";
import { nextVersion, releaseTags } from "./nextVersion";

const REPO = fileURLToPath(new URL("../../..", import.meta.url));

console.log(nextVersion(releaseTags(REPO)));
