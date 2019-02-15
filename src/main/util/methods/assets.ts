import * as download from "download";

export function downloadAsset(url: string, dest: string): Promise<void> {
  return download(url + "?list-type=2", dest, {
    headers: {
      Host: "components.century.tech.s3.amazonaws.com",
      "Content-Type": "application/x-compressed-tar"
    }
  }).then(() => void null);
}
