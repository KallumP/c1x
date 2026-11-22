// npm run next-version: prints the version release.bat suggests
import { fileURLToPath } from "node:url";
import { nextVersion, repositoryTags } from "./nextVersion";

const REPO = fileURLToPath(new URL("../../..", import.meta.url));

console.log(nextVersion(repositoryTags(REPO)));
