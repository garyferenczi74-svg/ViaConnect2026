import { gunzipSync } from "node:zlib";
import embedded from "./embedded223.json";

export type Embedded223 = { file: string; bytes: number; gz: string };

export function loadPrompt223Migrations(): Array<{ file: string; sql: string }> {
  return (embedded as Embedded223[]).map((item) => ({
    file: item.file,
    sql: gunzipSync(Buffer.from(item.gz, "base64")).toString("utf8"),
  }));
}
