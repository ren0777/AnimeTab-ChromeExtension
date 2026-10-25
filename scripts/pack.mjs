// Build the Chrome Web Store zip from the actual extension files only.
// Usage: npm run build && npm run package
//
// Included: manifest, runtime pages, background, data JSONs, dist bundle+fonts,
// bundled fallback images and icons.
// Excluded: dev sources, tests, docs, node_modules, .git, packaging artifacts.

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, existsSync, statSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const manifest = JSON.parse(readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

if (manifest.version !== pkg.version) {
  throw new Error(`Version mismatch: manifest ${manifest.version} vs package.json ${pkg.version}`);
}

const REQUIRED = [
  'manifest.json', 'newtab.html', 'privacy.html', 'background.js',
  'merch.json', 'quotes.json', 'dist/bundle.js'
];
for (const file of REQUIRED) {
  if (!existsSync(path.join(ROOT, file))) throw new Error(`Missing required file: ${file} — run npm run build first`);
}

const copyList = [];
const addFile = (rel) => copyList.push([rel, rel]);
const addDir = (rel) => {
  const abs = path.join(ROOT, rel);
  const walk = (dir, prefix) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      const arc = prefix + entry;
      if (statSync(full).isDirectory()) walk(full, `${arc}/`);
      else copyList.push([full, arc]);
    }
  };
  walk(abs, `${rel}/`);
};

['manifest.json', 'newtab.html', 'privacy.html', 'background.js', 'merch.json', 'quotes.json'].forEach(addFile);
addFile('src/lib/wallpaperSources.mjs'); // imported (as a module) by background.js
addDir('dist');
addDir('assets/fallback');
['assets/icon16.png', 'assets/icon48.png', 'assets/icon128.png'].forEach(addFile);

// assets/fonts is intentionally excluded — dist/fonts/ already ships the faces
// that bundle.js references. Nothing else in assets/ is loaded at runtime.

const OUT_DIR = path.join(ROOT, 'release');
rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });
const zipPath = path.join(OUT_DIR, `animetab-v${manifest.version}.zip`);

const PYTHON = `
import json, sys, zipfile
out, entries = sys.argv[1], json.loads(sys.argv[2])
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for real, arc in entries:
        z.write(real, arc)
for row in entries: print(row[1])
`;

const entries = copyList.map(([full, rel]) => [path.resolve(ROOT, full), rel]);
// Windows usually ships `python`/`py` rather than `python3`.
const PYTHON_BINS = ['python3', 'python', 'py'];
const pythonBin = PYTHON_BINS.find((bin) => {
  try {
    execFileSync(bin, ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
});
if (!pythonBin) throw new Error(`Python not found (tried ${PYTHON_BINS.join(', ')}) — needed to build the zip`);
execFileSync(pythonBin, ['-c', PYTHON, zipPath, JSON.stringify(entries)], { stdio: 'pipe' });

const sizeMB = statSync(zipPath).size / (1024 * 1024);
console.log(`Packaged ${entries.length} files → release/animetab-v${manifest.version}.zip (${sizeMB.toFixed(2)} MB)`);
if (sizeMB > 100) throw new Error('Package exceeds 100 MB — inspect bundled assets');
