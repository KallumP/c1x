// reading a request's body and sending the api's answer, for vite's dev server
// (plugin.ts) and the editor server (editorServer.ts)
import type { IncomingMessage, ServerResponse } from "node:http";
import type { ApiResponse } from "./api";

export function requestBody(req: IncomingMessage): Promise<string> {
  return new Promise((ok, fail) => {
    let text = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => { text += chunk; });
    req.on("end", () => ok(text));
    req.on("error", fail);
  });
}

export function sendApiResponse(res: ServerResponse, { status, type, body }: ApiResponse): void {
  res.statusCode = status;
  res.setHeader("Content-Type", type);
  res.end(body);
}
