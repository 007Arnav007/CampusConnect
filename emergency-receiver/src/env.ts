import { readFileSync } from "node:fs";
import path from "node:path";

const envFile = path.resolve(process.cwd(), process.env.CAMPUSCONNECT_ENV_FILE ?? "../.env");
try {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2").trim();
  }
} catch {
  // Environment may be supplied by the process manager.
}
