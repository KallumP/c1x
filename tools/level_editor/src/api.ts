// the dev server's api (server/plugin.ts)

export interface LevelInfo {
  name: string;  // its folder in level_src/
  obj: string;   // its .obj
  scale: number; // game units per blender metre
}

export const levelFilesUrl = (name: string) => `/api/levels/${encodeURIComponent(name)}/files/`;

async function ok(res: Response): Promise<Response> {
  if (!res.ok) throw new Error(await res.text());
  return res;
}

export async function fetchLevels(): Promise<LevelInfo[]> {
  return (await ok(await fetch("/api/levels"))).json();
}

export async function fetchObjects(name: string): Promise<string> {
  return (await ok(await fetch(`/api/levels/${encodeURIComponent(name)}/objects`))).text();
}

export async function saveObjects(name: string, text: string): Promise<void> {
  await ok(await fetch(`/api/levels/${encodeURIComponent(name)}/objects`, { method: "PUT", body: text }));
}
