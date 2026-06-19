#!/usr/bin/env node
//
// extract-snippets.mjs — single-source the reference code.
//
// Pulls every ```ts fenced block out of ../skill/*.md and writes each one as a
// standalone module into ../generated/. tsc then type-checks the *shipped prose
// itself* — there is no second hand-maintained copy to drift from.
//
import { readFileSync, writeFileSync, readdirSync, rmSync, mkdirSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const skillDir = join(here, "..", "..", "skill");
const outDir = join(here, "..", "generated");

// Fresh output dir every run so deleted blocks can't linger.
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// Pull all ```ts ... ``` blocks from one markdown file, in order.
function tsBlocks(md) {
  const lines = md.split("\n");
  const blocks = [];
  let buf = null;
  for (const line of lines) {
    if (buf === null && /^```ts\s*$/.test(line)) { buf = []; continue; }
    if (buf !== null && /^```\s*$/.test(line)) { blocks.push(buf.join("\n")); buf = null; continue; }
    if (buf !== null) buf.push(line);
  }
  return blocks;
}

let total = 0;
const files = readdirSync(skillDir).filter((f) => f.endsWith(".md")).sort();
for (const f of files) {
  const md = readFileSync(join(skillDir, f), "utf8");
  const blocks = tsBlocks(md);
  blocks.forEach((code, i) => {
    const stem = basename(f, ".md");
    const name = blocks.length > 1 ? `${stem}.${i + 1}.ts` : `${stem}.ts`;
    const header = `// AUTO-GENERATED from skill/${f} — edit the .md, not this file.\n`;
    writeFileSync(join(outDir, name), header + code + "\n");
    total++;
  });
}

console.log(`extracted ${total} TS block(s) from ${files.length} skill file(s) → verify/generated/`);
