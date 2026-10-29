#!/usr/bin/env node
// Reconciles package.json specifiers that `expo install --fix` leaves wrong.
//
// 1. Catalogs. Expo's installer does not understand them. When a catalog
//    package is out of line with the SDK it runs `pnpm add <pkg>@<version>`,
//    which replaces the `catalog:` specifier in package.json with a literal
//    version and leaves the catalog in pnpm-workspace.yaml stale. Put the
//    specifier back and move the catalog.
// 2. React Native companions. `react-native` is in Expo's version map but
//    `@react-native/*` packages (metro-config, babel-preset, ...) are not, and
//    they must match react-native exactly. Move the ones that tracked the old
//    react-native version to the new one.
//
//   reconcile-specifiers.mjs snapshot <file>    record the state before the fix
//   reconcile-specifiers.mjs reconcile <file>   repair it after the fix
//
// Run both from the Expo project directory. With nothing to repair it does
// nothing, so it is safe for projects without catalogs.
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
  const catalog = [];
  for (const field of DEP_FIELDS) {
    for (const [name, spec] of Object.entries(json[field] ?? {})) {
      if (isCatalogSpec(spec)) catalog.push({ field, name, spec });
    }
  }
  const reactNative = resolveVersion(dir, json, "react-native");
  writeFileSync(file, JSON.stringify({ catalog, reactNative }));
  console.log(`Recorded ${catalog.length} catalog: specifier(s), react-native ${reactNative ?? "unknown"}.`);
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

// Locates `name` in the catalog that `spec` (catalog: or catalog:foo) refers
// to. Returns the workspace file, its lines and the entry line index.
function findCatalogEntry(workspaceFile, spec, name) {
  const lines = readFileSync(workspaceFile, "utf8").split("\n");
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
    if (match && unquote(match[2]) === name) return { lines, index: i, match, catalogName };
  }
  throw new Error(`${name} not found in catalog "${catalogName}" of ${workspaceFile}`);
}

const getCatalogVersion = (workspaceFile, spec, name) =>
  unquote(findCatalogEntry(workspaceFile, spec, name).match[3]);

// Sets `name` to `version` in the catalog that `spec` refers to. Returns false
// when the catalog already had that version.
function setCatalogVersion(workspaceFile, spec, name, version) {
  const { lines, index, match } = findCatalogEntry(workspaceFile, spec, name);
  if (unquote(match[3]) === version) return false;
  lines[index] = `${match[1]}${match[2]}: ${formatValue(version, match[3])}${match[4] ?? ""}`;
  writeFileSync(workspaceFile, lines.join("\n"));
  return true;
}

const stripRange = (spec) => spec.replace(/^[\^~=]/, "");
const rangePrefix = (spec) => spec.match(/^[\^~=]?/)[0];

// The version a dependency resolves to from its specifier, following catalogs.
// Null when it is not a plain version (workspace:, npm:, tags, absent).
function resolveVersion(dir, json, name) {
  for (const field of DEP_FIELDS) {
    let spec = json[field]?.[name];
    if (spec === undefined) continue;
    if (isCatalogSpec(spec)) {
      try {
        spec = getCatalogVersion(findWorkspaceFile(dir), spec, name);
      } catch {
        return null;
      }
    }
    const version = stripRange(spec);
    return /^\d+\.\d+\.\d+/.test(version) ? version : null;
  }
  return null;
}

// Puts back the catalog: specifiers Expo replaced. Returns whether it changed
// anything.
function restoreCatalog(dir, recorded) {
  const { raw, json } = readPackage(dir);
  const restored = [];

  for (const { field, name, spec } of recorded) {
    const current = json[field]?.[name];
    if (current === undefined || isCatalogSpec(current) || current === spec) continue;
    json[field][name] = spec;
    restored.push({ name, spec, version: current });
  }
  if (restored.length === 0) return false;

  writePackage(dir, raw, json);
  const workspaceFile = findWorkspaceFile(dir);
  for (const { name, spec, version } of restored) {
    const moved = setCatalogVersion(workspaceFile, spec, name, version);
    console.log(`${name}: restored ${spec}${moved ? `, catalog set to ${version}` : ""}`);
  }
  return true;
}

// Moves @react-native/* packages that tracked the old react-native version to
// the new one. Returns whether it changed anything.
function alignReactNative(dir, previous) {
  const { raw, json } = readPackage(dir);
  const current = resolveVersion(dir, json, "react-native");
  if (!previous || !current || previous === current) return false;

  let changed = false;
  let packageChanged = false;
  for (const field of DEP_FIELDS) {
    for (const [name, spec] of Object.entries(json[field] ?? {})) {
      if (!name.startsWith("@react-native/")) continue;
      if (isCatalogSpec(spec)) {
        const workspaceFile = findWorkspaceFile(dir);
        const entry = getCatalogVersion(workspaceFile, spec, name);
        if (stripRange(entry) !== previous) continue;
        setCatalogVersion(workspaceFile, spec, name, rangePrefix(entry) + current);
      } else {
        if (stripRange(spec) !== previous) continue;
        json[field][name] = rangePrefix(spec) + current;
        packageChanged = true;
      }
      console.log(`${name}: ${previous} -> ${current} (follows react-native)`);
      changed = true;
    }
  }
  if (packageChanged) writePackage(dir, raw, json);
  return changed;
}

function reconcile(dir, file) {
  const { catalog, reactNative } = JSON.parse(readFileSync(file, "utf8"));
  // Restore catalogs first: react-native's new version is read through them.
  const restored = restoreCatalog(dir, catalog);
  const aligned = alignReactNative(dir, reactNative);
  if (!restored && !aligned) console.log("Nothing to reconcile.");

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `changed=${restored || aligned}\n`);
  }
}

const [mode, file] = process.argv.slice(2);
if (!["snapshot", "reconcile"].includes(mode) || !file) {
  console.error("usage: reconcile-specifiers.mjs <snapshot|reconcile> <file>");
  process.exit(2);
}
(mode === "snapshot" ? snapshot : reconcile)(process.cwd(), file);
