// the dev server's api (server/plugin.ts)

export interface LevelInfo {
  name: string;  // its folder in level_src/
  obj: string;   // its .obj
  scale: number; // game units per blender metre
}

export interface BuildResult {
  ok: boolean;
  output: string; // what build_level.py printed
}

export const levelFilesUrl = (name: string) => `/api/levels/${encodeURIComponent(name)}/files/`;

// the response, or its text as an error if the server refused
async function checked(response: Response): Promise<Response> {
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response;
}

export async function fetchLevels(): Promise<LevelInfo[]> {
  return (await checked(await fetch("/api/levels"))).json();
}

export async function fetchObjects(name: string): Promise<string> {
  return (await checked(await fetch(`/api/levels/${encodeURIComponent(name)}/objects`))).text();
}

export async function saveObjects(name: string, text: string): Promise<void> {
  await checked(await fetch(`/api/levels/${encodeURIComponent(name)}/objects`, { method: "PUT", body: text }));
}

export async function buildLevel(name: string): Promise<BuildResult> {
  return (await checked(await fetch(`/api/levels/${encodeURIComponent(name)}/build`, { method: "POST" }))).json();
}

export async function bootLevel(name: string): Promise<void> {
  await checked(await fetch(`/api/levels/${encodeURIComponent(name)}/boot`, { method: "POST" }));
}
