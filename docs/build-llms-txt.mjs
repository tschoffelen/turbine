/**
 * Generates llms.txt from all markdown files in docs/content/.
 * Output is written to docs/static/llms.txt so Zola serves it at /llms.txt.
 *
 * Usage: node docs/build-llms-txt.mjs
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, "content");
const OUTPUT = join(__dirname, "static", "llms.txt");

function parseFrontmatter(content) {
  const match = content.match(/^\+\+\+\n([\s\S]*?)\n\+\+\+\n/);
  if (!match) return { attrs: {}, body: content };

  const attrs = {};
  for (const line of match[1].split("\n")) {
    const m = line.match(/^(\w+)\s*=\s*"(.*)"/);
    if (m) attrs[m[1]] = m[2];
  }
  return { attrs, body: content.slice(match[0].length) };
}

function stripHtml(md) {
  return md.replace(/<[^>]+>/g, "");
}

const files = (await readdir(CONTENT_DIR))
  .filter((f) => f.endsWith(".md") && f !== "_index.md")
  .sort();

const index = parseFrontmatter(
  await readFile(join(CONTENT_DIR, "_index.md"), "utf8"),
);

const pages = await Promise.all(
  files.map(async (f) => {
    const raw = await readFile(join(CONTENT_DIR, f), "utf8");
    return { file: f, ...parseFrontmatter(raw) };
  }),
);

const parts = [
  `# Turbine`,
  ``,
  `> Type-safe entity mapping and query library for DynamoDB`,
  ``,
  stripHtml(index.body).trim(),
  ...pages.flatMap((p) => [``, `---`, ``, stripHtml(p.body).trim()]),
  ``,
];

await writeFile(OUTPUT, parts.join("\n"));
