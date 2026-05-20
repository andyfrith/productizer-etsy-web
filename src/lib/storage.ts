import fs from "node:fs";
import path from "node:path";

/**
 * Ensures the local asset storage directory exists (gitignored).
 * @returns Absolute path to storage root
 */
export function ensureStorageRoot(): string {
  const root = process.env.STORAGE_ROOT ?? "./storage";
  const absolute = path.isAbsolute(root)
    ? root
    : path.resolve(process.cwd(), root);

  if (!fs.existsSync(absolute)) {
    fs.mkdirSync(absolute, { recursive: true });
  }

  return absolute;
}
