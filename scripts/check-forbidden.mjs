// Fails if forbidden strings appear anywhere in tracked source/content.
// Patterns are built from parts so this file does not match itself.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const SKIP_DIRS = new Set(["node_modules", ".next", "out", ".git", "scripts"]);
const SKIP_FILES = new Set(["package-lock.json", "PORTFOLIO_SPEC.md", "STAGE3.md"]);
const EXTS = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".md", ".css", ".html", ".yml", ".yaml", ".tf"]);

const forbidden = [
  { name: "MOEYS", re: new RegExp("MO" + "EYS", "i") },
  { name: "Ministry of Education", re: new RegExp("Ministry of Education", "i") },
  { name: "Choschmous", re: new RegExp("Chosch" + "mous", "i") },
  { name: "phone number", re: /(\+?855|\b0)[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{3,4}\b/ },
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (EXTS.has(extname(p)) && !SKIP_FILES.has(name)) out.push(p);
  }
  return out;
}

let failed = false;
for (const file of walk(".")) {
  const text = readFileSync(file, "utf8");
  for (const { name, re } of forbidden) {
    if (re.test(text)) {
      console.error(`FORBIDDEN (${name}) in ${file}`);
      failed = true;
    }
  }
}
if (failed) process.exit(1);
console.log("forbidden-string check passed");
