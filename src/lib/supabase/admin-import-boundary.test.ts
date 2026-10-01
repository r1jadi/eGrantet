import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

async function sourceFiles(directory: string): Promise<string[]> { const entries = await readdir(directory, { withFileTypes: true }); const nested = await Promise.all(entries.map(async (entry) => entry.isDirectory() ? sourceFiles(path.join(directory, entry.name)) : [path.join(directory, entry.name)])); return nested.flat().filter((file) => /\.(ts|tsx)$/.test(file)); }
test("client-rendered code cannot import the service-role Supabase client", async () => { const roots = [path.join(process.cwd(), "src", "app"), path.join(process.cwd(), "src", "components")]; const files = (await Promise.all(roots.map(sourceFiles))).flat(); const violations: string[] = []; for (const file of files) { const content = await readFile(file, "utf8"); if (content.includes("@/lib/supabase/admin") || content.includes("lib/supabase/admin")) violations.push(file); } assert.deepEqual(violations, []); });
