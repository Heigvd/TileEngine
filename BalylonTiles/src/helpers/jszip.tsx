import JSZip from "jszip";
import { Buffer } from "buffer";

export function readJSONZipFile<T>(file: JSZip.JSZipObject) {
  return file
    .async("base64")
    .then((data) => {
      return JSON.parse(Buffer.from(data, "base64").toString()) as T;
    })
    .catch((e) => {
      throw e;
    });
}
