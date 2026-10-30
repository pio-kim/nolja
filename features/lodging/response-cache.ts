// Keeps SerpApi responses on disk so repeated searches (a rehearsed demo, the
// same stay opened again) cost no searches, and so a used-up quota or an
// upstream error can still show the last real result. Prices can change, so
// entries are fresh for a few hours and only served stale when SerpApi fails.
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const FRESH_MS = 6 * 60 * 60 * 1000;

export type CachedEntry = { savedAt: number; body: unknown };

export type ResponseCache = {
  get(key: string): Promise<CachedEntry | null>;
  put(key: string, body: unknown): Promise<void>;
};

export const isFresh = (entry: CachedEntry, now = Date.now()) => now - entry.savedAt < FRESH_MS;

export function diskCache(dir = path.join(process.cwd(), ".cache", "serpapi")): ResponseCache {
  const file = (key: string) => path.join(dir, `${createHash("sha256").update(key).digest("hex")}.json`);
  return {
    async get(key) {
      try {
        return JSON.parse(await readFile(file(key), "utf8")) as CachedEntry;
      } catch {
        return null;
      }
    },
    async put(key, body) {
      try {
        await mkdir(dir, { recursive: true });
        await writeFile(file(key), JSON.stringify({ savedAt: Date.now(), body } satisfies CachedEntry));
      } catch (error) {
        // A read-only filesystem (e.g. serverless) only loses the cache.
        console.error(error);
      }
    },
  };
}
