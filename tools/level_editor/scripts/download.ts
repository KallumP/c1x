// downloading a file whole, for a level from mod.io and a release from GitHub
import { errorMessage } from "../src/errorMessage";
import type { Answer } from "./answer";
import { fetchWithTimeout, type Fetch } from "./fetch";

// long enough for a release's zip on a slow connection; a request still has to
// give up some time, rather than leave the launcher saying it's downloading
const DOWNLOAD_TIMEOUT_MS = 10 * 60 * 1000;

// the bytes at url, or why they couldn't be downloaded
export async function downloadFile(
  url: string,
  fetchUrl: Fetch = fetch,
): Promise<Answer<Uint8Array>> {
  try {
    const response = await fetchWithTimeout(fetchUrl, url, DOWNLOAD_TIMEOUT_MS);
    if (!response.ok) {
      return { problem: `the download answered ${response.status}` };
    }
    return new Uint8Array(await response.arrayBuffer());
  } catch (error) {
    return { problem: `the download failed (${errorMessage(error)})` };
  }
}
