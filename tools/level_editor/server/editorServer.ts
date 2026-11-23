// the level editor without vite or node installed: its built page (vite build)
// and its api (api.ts), served by node's own http server, in the tools exe
import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { extname, relative, resolve, sep } from "node:path";
import { levelsApi, type ApiResponse } from "./api";
import { modioApi } from "./modioApi";
import { requestBody, sendApiResponse } from "./http";

export interface EditorServerOptions {
  repo: string;      // the project's folder, with level_src/ and streams/
  pageDir: string;   // the built page: index.html and its assets
  firstPort: number; // the port it tries first; then the next, and so on
}

type Api = (
  repo: string,
  method: string,
  path: string,
  readBody: () => Promise<string>,
) => Promise<ApiResponse>;

// each api, by the path it's under
const APIS: [string, Api][] = [
  ["/api/levels", levelsApi],
  ["/api/modio", modioApi],
];
const PORTS_TRIED = 20;
const PAGE_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".woff2": "font/woff2", ".wasm": "application/wasm",
};

// the line saying where the editor is, as vite says it, which the launcher looks for
export const addressLine = (address: string) => `  Local:   ${address}`;

// the file a path on the page is, or null if it isn't one (or is outside the page)
function pageFile(pageDir: string, urlPath: string): string | null {
  let path = decodeURIComponent(urlPath.split("?")[0]);
  if (path === "/") {
    path = "/index.html";
  }
  const file = resolve(pageDir, `.${path}`);
  const fromPage = relative(pageDir, file);
  if (fromPage.startsWith("..") || fromPage.includes(`..${sep}`)) {
    return null;
  }
  if (!existsSync(file) || !statSync(file).isFile()) {
    return null;
  }
  return file;
}

function sendPageFile(res: ServerResponse, pageDir: string, urlPath: string): void {
  const file = pageFile(pageDir, urlPath);
  if (!file) {
    sendApiResponse(res, { status: 404, type: "text/plain", body: "not found" });
    return;
  }
  sendApiResponse(res, { status: 200, type: PAGE_TYPES[extname(file).toLowerCase()] ?? "application/octet-stream", body: readFileSync(file) });
}

const isUnder = (url: string, path: string) =>
  url === path || url.startsWith(`${path}/`) || url.startsWith(`${path}?`);

async function answer(req: IncomingMessage, res: ServerResponse, { repo, pageDir }: EditorServerOptions): Promise<void> {
  const url = req.url ?? "/";
  const found = APIS.find(([path]) => isUnder(url, path));
  if (found) {
    const [path, api] = found;
    const apiPath = url.slice(path.length) || "/";
    const answered = await api(repo, req.method ?? "GET", apiPath, () => requestBody(req));
    sendApiResponse(res, answered);
    return;
  }
  sendPageFile(res, pageDir, url);
}

// whether the server got port: false if something else has it
function listenOn(server: Server, port: number): Promise<boolean> {
  return new Promise((done, fail) => {
    const onError = (error: NodeJS.ErrnoException) => {
      server.off("listening", onListening);
      if (error.code === "EADDRINUSE") {
        done(false);
        return;
      }
      fail(error);
    };
    const onListening = () => {
      server.off("error", onError);
      done(true);
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, "localhost");
  });
}

// listens on firstPort, or the next free one; the port it got
async function listenFrom(server: Server, firstPort: number): Promise<number> {
  for (let port = firstPort; port < firstPort + PORTS_TRIED; port++) {
    if (await listenOn(server, port)) {
      return port;
    }
  }
  throw new Error(`ports ${firstPort} to ${firstPort + PORTS_TRIED - 1} are all in use`);
}

// starts the editor; the server, and the address it's at
export async function startEditorServer(options: EditorServerOptions): Promise<{ server: Server; address: string }> {
  const server = createServer((req, res) => { answer(req, res, options); });
  const port = await listenFrom(server, options.firstPort);
  return { server, address: `http://localhost:${port}/` };
}
