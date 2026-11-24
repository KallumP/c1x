import { describe, expect, test } from "vitest";
import { downloadFile } from "../../launcher/download";

describe("downloading a file", () => {
  test("is the file's bytes", async () => {
    const fetchUrl = async () => new Response(new Uint8Array([1, 2, 3]));
    expect(await downloadFile("https://mod.io/files/tide.zip", fetchUrl)).toEqual(
      new Uint8Array([1, 2, 3]),
    );
  });

  test("says when the download can't be reached", async () => {
    const fetchUrl = async () => { throw new Error("offline"); };
    expect(await downloadFile("https://mod.io/files/tide.zip", fetchUrl)).toEqual({
      problem: "the download failed (offline)",
    });
  });

  test("says when the download is refused", async () => {
    const fetchUrl = async () => new Response("gone", { status: 404 });
    expect(await downloadFile("https://mod.io/files/tide.zip", fetchUrl)).toEqual({
      problem: "the download answered 404",
    });
  });
});
