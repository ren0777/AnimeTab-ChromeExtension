#!/usr/bin/env node
// Release loop: one command per iteration.
//   npm run release            → patch bump (1.5.0 → 1.5.1)
//   npm run release minor      → minor bump (1.5.0 → 1.6.0)
//   npm run release major      → major bump
//
// Guards a clean git tree, bumps manifest + package.json + the newtab cache
// bust in lockstep, runs the full verify suite (lint → test → build),
// packages the store zip, then commits and tags v{version}.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const part = process.argv[2] || 'patch';
if (!['patch', 'minor', 'major'].includes(part)) {
  console.error(`Usage: npm run release [patch|minor|major] (got: ${part})`);
  process.exit(1);
}

const git = (...args) => execFileSync('git', args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim();
const run = (cmd, args) => execFileSync(cmd, args, { cwd: ROOT, stdio: 'inherit' });

// 1. Clean tree guard.
if (git('status', '--porcelain').length) {
  console.error('✋ Working tree not clean — commit or stash first, then run the release.');
  process.exit(1);
}

// 2. Bump versions in lockstep.
const manifestPath = path.join(ROOT, 'manifest.json');
const pkgPath = path.join(ROOT, 'package.json');
const htmlPath = path.join(ROOT, 'newtab.html');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const oldVersion = manifest.version;
const parts = oldVersion.split('.').map(Number);
const bumpIndex = { major: 0, minor: 1, patch: 2 }[part];
parts[bumpIndex] += 1;
for (let i = bumpIndex + 1; i < parts.length; i++) parts[i] = 0;
const version = parts.join('.');
manifest.version = version;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
pkg.version = version;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
const html = readFileSync(htmlPath, 'utf8');
if (!new RegExp(`bundle\\\\.js\\\\?v=${oldVersion.replace(/\./g, '\\.')}`).test(html)) {
  console.warn(`note: newtab.html cache-bust does not match ${oldVersion} — skipping its sync`);
} else {
  writeFileSync(htmlPath, html.replace(`bundle.js?v=${oldVersion}`, `bundle.js?v=${version}`));
}
console.log(`⏫ ${oldVersion} → ${version}`);

// 3. Full verification suite.
for (const [cmd, args] of [['npm', ['run', 'lint']], ['npm', ['test']], ['npm', ['run', 'build']], ['npm', ['run', 'package']]]) {
  run(cmd, args);
}

// 4. Commit + tag.
git('add', '-A');
git('commit', '-q', '-m', `release v${version}`);
git('tag', `v${version}`);

console.log(`\n✅ Released v${version} — store zip: release/animetab-v${version}.zip`);
