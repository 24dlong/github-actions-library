#!/usr/bin/env node
// Keeps pnpm `catalog:` specifiers intact across `expo install --fix`.
//
// Expo's installer does not understand catalogs. When a catalog package is out
// of line with the SDK it runs `pnpm add <pkg>@<version>`, which replaces the
// `catalog:` specifier in package.json with a literal version and leaves the
// catalog in pnpm-workspace.yaml stale.
//
//   restore-catalog.mjs snapshot <file>   record the catalog: specifiers
//   restore-catalog.mjs restore <file>    put them back and move the catalog
//
// Run both from the Expo project directory. With no catalog: specifiers (or no
// change) it does nothing, so it is safe for projects that do not use catalogs.
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, parse } from "node:path";

const DEP_FIELDS = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];

const isCatalogSpec = (spec) => typeof spec === "string" && spec.startsWith("catalog:");

function readPackage(dir) {
  const raw = readFileSync(join(dir, "package.json"), "utf8");
  return { raw, json: JSON.parse(raw) };
}

function writePackage(dir, raw, json) {
  const indent = raw.match(/^([ \t]+)"/m)?.[1] ?? "  ";
  const trailingNewline = raw.endsWith("\n") ? "\n" : "";
  writeFileSync(join(dir, "package.json"), JSON.stringify(json, null, indent) + trailingNewline);
}

function snapshot(dir, file) {
  const { json } = readPackage(dir);
  const specs = [];
  for (const field of DEP_FIELDS) {
    for (const [name, spec] of Object.entries(json[field] ?? {})) {
      if (isCatalogSpec(spec)) specs.push({ field, name, spec });
    }
  }
  writeFileSync(file, JSON.stringify(specs));
  console.log(`Recorded ${specs.length} catalog: specifier(s).`);
}

function findWorkspaceFile(dir) {
  for (let current = dir; ; current = dirname(current)) {
    const candidate = join(current, "pnpm-workspace.yaml");
    if (existsSync(candidate)) return candidate;
    if (current === parse(current).root) {
      throw new Error(`pnpm-workspace.yaml not found above ${dir}`);
    }
  }
}

const unquote = (key) => key.replace(/^(["'])(.*)\1$/, "$2");
const indentOf = (line) => line.length - line.trimStart().length;
const isContent = (line) => line.trim() !== "" && !line.trim().startsWith("#");

// Index range [start, end) of the lines under the mapping that begins at
// `header`, or null when absent.
function sectionBody(lines, header, from, to, headerIndent) {
  for (let i = from; i < to; i++) {
    if (!isContent(lines[i]) || indentOf(lines[i]) !== headerIndent) continue;
    const match = lines[i].match(/^\s*(\S.*?)\s*:\s*(#.*)?$/);
    if (!match || unquote(match[1]) !== header) continue;
    let end = i + 1;
    while (end < to && (!isContent(lines[end]) || indentOf(lines[end]) > headerIndent)) end++;
    return [i + 1, end];
  }
  return null;
}

function formatValue(version, previous) {
  const quote = previous.match(/^(["'])/)?.[1];
  if (quote) return `${quote}${version}${quote}`;
  const needsQuotes = /^[\[\]{}&*!|>'"%@`#,?:-]/.test(version) || /: | #/.test(version);
  return needsQuotes ? JSON.stringify(version) : version;
}

// Sets `name` to `version` in the catalog that `spec` (catalog: or catalog:foo)
// refers to. Returns false when the catalog already had that version.
function setCatalogVersion(workspaceFile, spec, name, version) {
  const raw = readFileSync(workspaceFile, "utf8");
  const lines = raw.split("\n");
  const catalogName = spec.slice("catalog:".length) || "default";

  const section =
    catalogName === "default"
      ? sectionBody(lines, "catalog", 0, lines.length, 0)
      : (() => {
          const outer = sectionBody(lines, "catalogs", 0, lines.length, 0);
          if (!outer) return null;
          const first = lines.slice(...outer).find(isContent);
          const innerIndent = first ? indentOf(first) : 2;
          return sectionBody(lines, catalogName, outer[0], outer[1], innerIndent);
        })();
  if (!section) throw new Error(`catalog "${catalogName}" not found in ${workspaceFile}`);

  for (let i = section[0]; i < section[1]; i++) {
    const match = lines[i].match(/^(\s*)(\S.*?)\s*:\s*(.*?)(\s+#.*)?$/);
    if (!match || unquote(match[2]) !== name) continue;
    if (unquote(match[3]) === version) return false;
    lines[i] = `${match[1]}${match[2]}: ${formatValue(version, match[3])}${match[4] ?? ""}`;
    writeFileSync(workspaceFile, lines.join("\n"));
    return true;
  }
  throw new Error(`${name} not found in catalog "${catalogName}" of ${workspaceFile}`);
}

function restore(dir, file) {
  const recorded = JSON.parse(readFileSync(file, "utf8"));
  const { raw, json } = readPackage(dir);
  const restored = [];

  for (const { field, name, spec } of recorded) {
    const current = json[field]?.[name];
    if (current === undefined || isCatalogSpec(current) || current === spec) continue;
    json[field][name] = spec;
    restored.push({ name, spec, version: current });
  }

  if (restored.length > 0) {
    writePackage(dir, raw, json);
    const workspaceFile = findWorkspaceFile(dir);
    for (const { name, spec, version } of restored) {
      const moved = setCatalogVersion(workspaceFile, spec, name, version);
      console.log(`${name}: restored ${spec}${moved ? `, catalog set to ${version}` : ""}`);
    }
  } else {
    console.log("No catalog: specifiers were replaced.");
  }

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `restored=${restored.length > 0}\n`);
  }
}

const [mode, file] = process.argv.slice(2);
if (!["snapshot", "restore"].includes(mode) || !file) {
  console.error("usage: restore-catalog.mjs <snapshot|restore> <file>");
  process.exit(2);
}
(mode === "snapshot" ? snapshot : restore)(process.cwd(), file);
