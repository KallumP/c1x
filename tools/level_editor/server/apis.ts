// the editor's apis, by the path each is under, for vite's dev server
// (plugin.ts) and the editor server in the tools exe (editorServer.ts)
import { levelsApi, type Api } from "./api";
import { modioApi } from "./modioApi";

export const APIS: [string, Api][] = [
  ["/api/levels", levelsApi],
  ["/api/modio", modioApi],
];
